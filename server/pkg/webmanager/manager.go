package webmanager

import (
	"fmt"

	"github.com/massalabs/deweb-server/pkg/cache"
	"github.com/massalabs/deweb-server/pkg/website"
	msConfig "github.com/massalabs/station/int/config"
	"github.com/massalabs/station/pkg/logger"
)

// getWebsiteResource fetches a resource from a website and returns its content.
func GetWebsiteResource(network *msConfig.NetworkInfos, websiteAddress, resourceName string, cache *cache.Cache) ([]byte, map[string]string, error) {
	logger.Debugf("Getting website %s resource %s", websiteAddress, resourceName)

	content, httpHeaders, err := RequestFile(websiteAddress, network, resourceName, cache)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get file %s from website %s: %w", resourceName, websiteAddress, err)
	}

	logger.Debugf("Resource %s from %s successfully retrieved", resourceName, websiteAddress)

	return content, httpHeaders, nil
}

// RequestFile fetches a website and caches it, or retrieves it from the cache if already present.
func RequestFile(scAddress string, networkInfo *msConfig.NetworkInfos, resourceName string, cache *cache.Cache) ([]byte, map[string]string, error) {
	// Get the last update timestamp from the website
	lastUpdated, err := website.GetLastUpdateTimestamp(networkInfo, scAddress)
	if err != nil {
		logger.Warnf("Failed to get last update timestamp: %v", err)
	} else if cache != nil {
		lastModified, err := cache.GetLastModified(scAddress, resourceName)
		if err != nil {
			logger.Debugf("Resource %s from %s not in cache", resourceName, scAddress)
		} else if !lastModified.Before(*lastUpdated) {
			content, headers, err := cache.Read(scAddress, resourceName)
			if err != nil {
				logger.Warnf("Failed to read cached resource %s from %s: %v", resourceName, scAddress, err)
			} else {
				logger.Debugf("RequestFile: Cache hit for %s", resourceName)
				return content, headers, nil
			}
		} else {
			if err = cache.Delete(scAddress, resourceName); err != nil {
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

	httpHeaders, err := website.GetHttpHeaders(networkInfo, scAddress, resourceName)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to fetch http header metadata: %w", err)
	}

	logger.Debugf("RequestFile: Headers for %s successfully fetched: %v", resourceName, httpHeaders)

	// Save to cache if available
	if cache != nil {
		err = cache.Save(scAddress, resourceName, websiteBytes, *lastUpdated, httpHeaders)
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
