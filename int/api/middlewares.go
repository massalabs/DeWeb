package api

import (
	_ "embed"
	"fmt"
	"net/http"
	"slices"
	"strings"

	"github.com/massalabs/DeWeb/int/api/config"
	"github.com/massalabs/DeWeb/pkg/mns"
	"github.com/massalabs/DeWeb/pkg/webmanager"
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

		path := cleanPath(r.URL.Path)

		logger.Debugf("SubdomainMiddleware: Subdomain %s found, resolving address", subdomain)

		address, err := resolveAddress(subdomain, conf.NetworkInfos)
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

		if !isWebsiteAllowed(address, subdomain, conf.AllowList, conf.BlockList) {
			logger.Warnf("Subdomain %s or address %s is not allowed", subdomain, address)

			localHandler(w, notAvailableZip, path)

			return
		}

		serveContent(conf, address, path, w)
	})
}

// serveContent serves the requested resource for the given website address.
func serveContent(conf *config.ServerConfig, address string, path string, w http.ResponseWriter) {
	content, mimeType, err := getWebsiteResource(&conf.NetworkInfos, address, path)
	if err != nil {
		logger.Errorf("Failed to get website %s resource %s: %v", address, path, err)

		localHandler(w, brokenWebsiteZip, path)

		return
	}

	w.Header().Set("Content-Type", mimeType)

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
func resolveAddress(subdomain string, network msConfig.NetworkInfos) (string, error) {
	domainTarget, err := mns.ResolveDomain(&network, subdomain)
	if err != nil {
		return "", fmt.Errorf("could not resolve MNS domain: %w", err)
	}

	logger.Debugf("Resolved subdomain %s to address %s", subdomain, domainTarget)

	return domainTarget, nil
}

func getWebsiteResource(network *msConfig.NetworkInfos, websiteAddress, resourceName string) ([]byte, string, error) {
	logger.Debugf("Getting website %s resource %s", websiteAddress, resourceName)

	content, notFound, err := webmanager.GetWebsiteResource(network, websiteAddress, resourceName)
	if err != nil {
		if !notFound {
			return nil, "", fmt.Errorf("failed to get website: %w", err)
		}

		// Handling Single Page Apps
		if notFound && resourceName != "index.html" {
			logger.Warnf("Failed to get file %s from zip: %v", resourceName, err)
			resourceName = "index.html"

			content, notFound, err = webmanager.GetWebsiteResource(network, websiteAddress, resourceName)
			if err != nil {
				if notFound {
					return nil, "", fmt.Errorf("could not find index.html in website: %w", err)
				}

				return nil, "", fmt.Errorf("failed to get file from zip: %w", err)
			}
		}
	}

	contentType := ContentType(resourceName, content)
	logger.Debugf("Got website %s resource %s with content type %s", websiteAddress, resourceName, contentType)

	if strings.HasPrefix(contentType, "text/html") {
		logger.Debugf("Injecting 'Hosted by Massa' box")
		content = InjectStyles(content)
		content = InjectHtmlBox(content, network.ChainID)
		logger.Debugf("Injected 'Hosted by Massa' box\n%s", content)
	}

	return content, contentType, nil
}

// isWebsiteAllowed checks the allow and block lists and returns false if the address or domain is not allowed.
// If the allow list is empty, all addresses and domains are allowed, except those in the block list.
// Otherwise, only addresses and domains in the allow list are allowed.
func isWebsiteAllowed(address string, domain string, allowList, blockList []string) bool {
	if slices.Contains(blockList, address) || slices.Contains(blockList, domain) {
		logger.Debugf("Address %s or domain %s is in the block list", address, domain)
		return false
	}

	if len(allowList) > 0 && !slices.Contains(allowList, address) && !slices.Contains(allowList, domain) {
		logger.Debugf("Address %s or domain %s is not in the allow list", address, domain)
		return false
	}

	return true
}
