package api

import (
	_ "embed"
	"fmt"
	"net/http"
	"slices"
	"strings"

	"github.com/massalabs/deweb-server/int/api/config"
	"github.com/massalabs/deweb-server/pkg/cache"
	"github.com/massalabs/deweb-server/pkg/mns"
	mnscache "github.com/massalabs/deweb-server/pkg/mns/cache"
	"github.com/massalabs/deweb-server/pkg/webmanager"
	mwUtils "github.com/massalabs/station-massa-wallet/pkg/utils"
	msConfig "github.com/massalabs/station/int/config"
	"github.com/massalabs/station/pkg/logger"
)

//go:embed resources/domainNotFound.zip
var domainNotFoundZip []byte

//go:embed resources/notAvailable.zip
var notAvailableZip []byte

//go:embed resources/brokenWebsite.zip
var brokenWebsiteZip []byte

var dewebInfoPath = "/__deweb_info"

// SubdomainMiddleware handles subdomain website serving.
func SubdomainMiddleware(handler http.Handler, conf *config.ServerConfig) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		logger.Debugf("SubdomainMiddleware: Handling request for %s", r.Host)

		subdomain := extractSubdomain(r.Host, conf.Domain)
		if subdomain == "" {
			logger.Debug("SubdomainMiddleware: No subdomain found. Proceeding with the next handler.")
			handler.ServeHTTP(w, r)

			return
		}

		// __deweb_info endpoint must be available from all subdomains
		if r.URL.Path == dewebInfoPath {
			logger.Debug("SubdomainMiddleware: Requested __deweb_info endpoint. Preceding with the next handler.")
			handler.ServeHTTP(w, r)

			return
		}

		path := cleanPath(r.URL.Path)

		logger.Debugf("SubdomainMiddleware: Subdomain %s found, resolving address", subdomain)

		logger.Debugf("SubdomainMiddleware: Getting cache from context")

		cache := GetCacheFromContext(r)
		if cache == nil {
			logger.Warnf("No cache instance found in context")
		}

		mnsCache := GetMNSCacheFromContext(r)
		if mnsCache == nil {
			logger.Warnf("No MNS cache instance found in context")
		}

		address, err := resolveAddress(subdomain, conf.NetworkInfos, mnsCache)
		if err != nil {
			logger.Warnf("Subdomain %s could not be resolved to an address: %v", subdomain, err)

			localHandler(w, domainNotFoundZip, path)

			return
		}

		if !mwUtils.IsValidAddress(address) {
			logger.Warnf("%s is not a valid address", address)

			localHandler(w, brokenWebsiteZip, path)

			return
		}

		if !isWebsiteAllowed(address, subdomain, conf) {
			logger.Warnf("Subdomain %s or address %s is not allowed", subdomain, address)

			localHandler(w, notAvailableZip, path)

			return
		}

		serveContent(conf, address, path, w, cache)
	})
}

// serveContent serves the requested resource for the given website address.
func serveContent(conf *config.ServerConfig, address string, path string, w http.ResponseWriter, cache *cache.Cache) {
	content, mimeType, httpHeaders, err := getWebsiteResource(conf, address, path, cache)
	if err != nil {
		logger.Errorf("Failed to get website %s resource %s: %v", address, path, err)

		localHandler(w, brokenWebsiteZip, path)

		return
	}

	w.Header().Set("Content-Type", mimeType)

	for key, value := range httpHeaders {
		w.Header().Set(key, value)
	}

	_, err = w.Write(content)
	if err != nil {
		logger.Errorf("Failed to write content: %v", err)
		http.Error(w, "an error occurred while writing response", http.StatusInternalServerError)
	}
}

// extractSubdomain extracts the subdomain from the host.
func extractSubdomain(host string, domain string) string {
	subdomain := strings.Split(host, domain)[0]

	return strings.TrimSuffix(subdomain, ".")
}

// cleanPath cleans the URL path.
func cleanPath(urlPath string) string {
	path := strings.TrimPrefix(urlPath, "/")
	if path == "" {
		logger.Debugf("Path is empty, redirecting to index.html")
		path = "index.html"
	}

	return path
}

// resolveAddress resolves the subdomain to an address.
func resolveAddress(subdomain string, network msConfig.NetworkInfos, mnsCache *mnscache.MNSCache) (string, error) {
	if mnsCache != nil {
		domainTarget, ok := mnsCache.Get(subdomain)
		if ok {
			logger.Debugf("Resolved subdomain %s to address %s", subdomain, domainTarget)
			return domainTarget, nil
		}
	}

	domainTarget, err := mns.ResolveDomain(&network, subdomain)
	if err != nil {
		return "", fmt.Errorf("could not resolve MNS domain: %w", err)
	}

	logger.Debugf("Resolved subdomain %s to address %s", subdomain, domainTarget)

	if mnsCache != nil {
		mnsCache.Set(subdomain, domainTarget)
	}

	return domainTarget, nil
}

// resolveResourceName resolves the resource name to the resource name on the chain.
// It also handles the case where the resource name is not found and tries to find the closest match
// by adding the .html extension or by using the index.html resource.
func resolveResourceName(network *msConfig.NetworkInfos, websiteAddress, resourceName string) (string, error) {
	exists, err := webmanager.ResourceExistsOnChain(network, websiteAddress, resourceName)
	if err != nil {
		return "", fmt.Errorf("failed to check if resource exists: %w", err)
	}

	if !exists {
		logger.Warnf("Resource %s not found in website %s", resourceName, websiteAddress)
		// Handling missing .html extension
		if !strings.HasSuffix(resourceName, ".html") {
			resourceName += ".html"

			exists, err = webmanager.ResourceExistsOnChain(network, websiteAddress, resourceName)
			if err != nil {
				return "", fmt.Errorf("failed to check if resource exists: %w", err)
			}

			if exists {
				return resourceName, nil
			}
		}

		// Handling Single Page Apps
		if resourceName != "index.html" {
			resourceName = "index.html"

			exists, err = webmanager.ResourceExistsOnChain(network, websiteAddress, resourceName)
			if err != nil {
				return "", fmt.Errorf("failed to check if resource exists: %w", err)
			}

			if exists {
				return resourceName, nil
			}
		}
	}

	return resourceName, nil
}

func getWebsiteResource(config *config.ServerConfig, websiteAddress, resourceName string, cache *cache.Cache) ([]byte, string, map[string]string, error) {
	logger.Debugf("Getting website %s resource %s", websiteAddress, resourceName)

	// TODO: Check in cache before resolving the resource name ?
	resourceName, err := resolveResourceName(&config.NetworkInfos, websiteAddress, resourceName)
	if err != nil {
		return nil, "", nil, fmt.Errorf("failed to resolve resource name: %w", err)
	}

	content, httpHeaders, err := webmanager.GetWebsiteResource(&config.NetworkInfos, websiteAddress, resourceName, cache)
	if err != nil {
		return nil, "", nil, fmt.Errorf("failed to get website %s resource %s: %w", websiteAddress, resourceName, err)
	}

	contentType := ContentType(resourceName, content)
	logger.Debugf("Got website %s resource %s with content type %s", websiteAddress, resourceName, contentType)

	if strings.HasPrefix(contentType, "text/html") {
		logger.Debugf("Injecting 'Hosted by Massa' box")

		content = InjectOnChainBox(content, config.NetworkInfos.ChainID)
	}

	return content, contentType, httpHeaders, nil
}

// isWebsiteAllowed checks the allow and block lists and returns false if the address or domain is not allowed.
// If the allow list is empty, all addresses and domains are allowed, except those in the block list.
// Otherwise, only addresses and domains in the allow list are allowed.
func isWebsiteAllowed(address string, domain string, config *config.ServerConfig) bool {
	if slices.Contains(config.BlockList, address) || slices.Contains(config.BlockList, domain) {
		logger.Debugf("Address %s or domain %s is in the block list", address, domain)
		return false
	}

	if len(config.AllowList) > 0 && !slices.Contains(config.AllowList, address) && !slices.Contains(config.AllowList, domain) {
		logger.Debugf("Address %s or domain %s is not in the allow list", address, domain)
		return false
	}

	return true
}
