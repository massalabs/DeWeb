package webmanager

import (
	"fmt"

	"github.com/massalabs/deweb-server/int/api/config"
	"github.com/massalabs/deweb-server/pkg/cache"
	"github.com/massalabs/deweb-server/pkg/website"
	msConfig "github.com/massalabs/station/int/config"
	"github.com/massalabs/station/pkg/logger"
)

const cacheDir = "./websitesCache/"

var (
	cacheInstance *cache.Cache
	cacheErr      error
	serverConfig  *config.ServerConfig
)

// SetConfig sets the server configuration for the webmanager
func SetConfig(config *config.ServerConfig) {
	serverConfig = config
}

// CacheInstance returns the global cache instance
func CacheInstance() *cache.Cache {
	return cacheInstance
}

// initCache initializes the cache instance if it hasn't been initialized yet
func initCache() error {
	if cacheInstance == nil {
		// If serverConfig is not set, log a warning and use default values
		var maxRAMEntries uint64 = config.DefaultMaxRAMEntries
		var maxDiskEntries uint64 = config.DefaultMaxDiskEntries

		if serverConfig != nil {
			maxRAMEntries = serverConfig.SiteRAMCacheMaxItems
			maxDiskEntries = serverConfig.SiteDiskCacheMaxItems
		} else {
			logger.Debugf("Server config not set, using default cache values")
		}

		cacheInstance, cacheErr = cache.NewCache(cacheDir, maxRAMEntries, maxDiskEntries)
		if cacheErr != nil {
			logger.Errorf("Failed to create cache: %v", cacheErr)
			return cacheErr
		}
	}

	return nil
}

// getWebsiteResource fetches a resource from a website and returns its content.
func GetWebsiteResource(network *msConfig.NetworkInfos, websiteAddress, resourceName string) ([]byte, map[string]string, error) {
	logger.Debugf("Getting website %s resource %s", websiteAddress, resourceName)

	content, httpHeaders, err := RequestFile(websiteAddress, network, resourceName)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get file %s from website %s: %w", resourceName, websiteAddress, err)
	}

	logger.Debugf("Resource %s from %s successfully retrieved", resourceName, websiteAddress)

	return content, httpHeaders, nil
}

// RequestFile fetches a website and caches it, or retrieves it from the cache if already present.
func RequestFile(scAddress string, networkInfo *msConfig.NetworkInfos, resourceName string) ([]byte, map[string]string, error) {
	// Initialize cache if needed
	if err := initCache(); err != nil {
		logger.Errorf("Failed to initialize cache: %v", err)
	}

	// This could be cached as well.
	httpHeaders, err := website.GetHttpHeaders(networkInfo, scAddress, resourceName)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to fetch http header metadata: %w", err)
	}

	// Get the last update timestamp from the website
	lastUpdated, err := website.GetLastUpdateTimestamp(networkInfo, scAddress)
	if err != nil {
		logger.Warnf("Failed to get last update timestamp: %v", err)
	} else if cacheInstance != nil {
		lastModified, err := cacheInstance.GetLastModified(scAddress, resourceName)
		if err != nil {
			logger.Debugf("Resource %s from %s not in cache", resourceName, scAddress)
		} else if !lastModified.Before(*lastUpdated) {
			content, err := cacheInstance.Read(scAddress, resourceName)
			if err != nil {
				logger.Warnf("Failed to read cached resource %s from %s: %v", resourceName, scAddress, err)
			} else {
				logger.Debugf("RequestFile completed (cache hit)")
				return content, httpHeaders, nil
			}
		} else {
			if err = cacheInstance.Delete(scAddress, resourceName); err != nil {
				logger.Warnf("Failed to delete outdated resource %s from %s: %v", resourceName, scAddress, err)
			}

			logger.Warnf("website %s is outdated, fetching...", resourceName)
		}
	}

	logger.Debugf("Website %s not found in cache or not up to date, fetching...", scAddress)

	// Fetch the website content
	websiteBytes, err := website.Fetch(networkInfo, scAddress, resourceName)
	if err != nil {
		logger.Debugf("RequestFile failed")
		return nil, nil, fmt.Errorf("failed to fetch %s from %s: %w", resourceName, scAddress, err)
	}

	logger.Debugf("%s: %s successfully fetched with size: %d bytes", scAddress, resourceName, len(websiteBytes))

	// Save to cache if available
	if cacheInstance != nil {
		err = cacheInstance.Save(scAddress, resourceName, websiteBytes, *lastUpdated)
		if err != nil {
			logger.Warnf("Failed to save %s to %s cache: %v", resourceName, scAddress, err)
		} else {
			logger.Debugf("%s: %s successfully written to cache", scAddress, resourceName)
		}
	}

	logger.Debugf("RequestFile completed")

	return websiteBytes, httpHeaders, nil
}

func ResourceExistsOnChain(network *msConfig.NetworkInfos, websiteAddress, filePath string) (bool, error) {
	logger.Debugf("Checking if file %s exists on chain for website %s", filePath, websiteAddress)

	isPresent, err := website.FilePathExists(network, websiteAddress, filePath)
	if err != nil {
		return false, fmt.Errorf("checking if file is present on chain: %w", err)
	}

	return isPresent, nil
}
