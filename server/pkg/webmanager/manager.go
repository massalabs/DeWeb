package webmanager

import (
	"fmt"

	"github.com/massalabs/deweb-server/pkg/cache"
	"github.com/massalabs/deweb-server/pkg/website"
	msConfig "github.com/massalabs/station/int/config"
	"github.com/massalabs/station/pkg/logger"
)

const cacheDir = "./websitesCache/"

// getWebsiteResource fetches a resource from a website and returns its content.
func GetWebsiteResource(network *msConfig.NetworkInfos, websiteAddress, resourceName string) ([]byte, error) {
	logger.Debugf("Getting website %s resource %s", websiteAddress, resourceName)

	content, err := RequestFile(websiteAddress, network, resourceName)
	if err != nil {
		return nil, fmt.Errorf("failed to get file %s from website %s: %w", resourceName, websiteAddress, err)
	}

	logger.Debugf("Resource %s from %s successfully retrieved", resourceName, websiteAddress)

	return content, nil
}

// RequestFile fetches a website and caches it, or retrieves it from the cache if already present.
func RequestFile(scAddress string, networkInfo *msConfig.NetworkInfos, resourceName string) ([]byte, error) {
	cache, err := cache.NewCache(cacheDir)
	if err != nil {
		logger.Errorf("Failed to create cache: %v", err)
	}

	if cache != nil && cache.IsPresent(scAddress, resourceName) {
		logger.Debugf("Resource %s from %s present in cache", resourceName, scAddress)

		isOutdated, err := isFileOutdated(cache, networkInfo, scAddress, resourceName)
		if err != nil {
			logger.Warnf("Failed to check if file is outdated: %v", err)
		} else {
			if !isOutdated {
				content, err := cache.Read(scAddress, resourceName)
				if err != nil {
					logger.Warnf("Failed to read cached resource %s from %s: %v", resourceName, scAddress, err)
				} else {
					return content, nil
				}
			} else {
				if err = cache.Delete(scAddress, resourceName); err != nil {
					logger.Warnf("Failed to delete outdated resource %s from %s: %v", resourceName, scAddress, err)
				}
			}
		}

		logger.Warnf("website %s is outdated, fetching...", resourceName)
	}

	logger.Debugf("Website %s not found in cache or not up to date, fetching...", scAddress)

	websiteBytes, err := fetchAndCache(networkInfo, scAddress, cache, resourceName)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch and cache website: %w", err)
	}

	return websiteBytes, nil
}

// Fetches the website and saves it to the cache.
func fetchAndCache(networkInfo *msConfig.NetworkInfos, scAddress string, cache *cache.Cache, resourceName string) ([]byte, error) {
	websiteBytes, err := website.Fetch(networkInfo, scAddress, resourceName)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch %s from %s: %w", resourceName, scAddress, err)
	}

	logger.Debugf("%s: %s successfully fetched with size: %d bytes", scAddress, resourceName, len(websiteBytes))

	if cache != nil {
		err := cache.Save(scAddress, resourceName, websiteBytes)
		if err != nil {
			return nil, fmt.Errorf("failed to save %s to %s cache: %w", resourceName, scAddress, err)
		}

		logger.Infof("%s: %s successfully written to cache", scAddress, resourceName)
	}

	return websiteBytes, nil
}

// Compares the last updated timestamp to the file's last modified timestamp.
// Returns true if the file is outdated or if an error occurred. Otherwise, returns false.
//
//nolint:unused
func isFileOutdated(cache *cache.Cache, networkInfo *msConfig.NetworkInfos, scAddress string, fileName string) (bool, error) {
	lastUpdated, err := website.GetLastUpdateTimestamp(networkInfo, scAddress)
	if err != nil {
		return true, fmt.Errorf("failed to get last update timestamp: %w", err)
	}

	lastModified, err := cache.GetLastModified(scAddress, fileName)
	if err != nil {
		return true, fmt.Errorf("failed to get file info: %w", err)
	}

	return lastModified.Before(*lastUpdated), nil
}

func ResourceExistsOnChain(network *msConfig.NetworkInfos, websiteAddress, filePath string) (bool, error) {
	logger.Debugf("Checking if file %s exists on chain for website %s", filePath, websiteAddress)

	isPresent, err := website.FilePathExists(network, websiteAddress, filePath)
	if err != nil {
		return false, fmt.Errorf("checking if file is present on chain: %w", err)
	}

	return isPresent, nil
}

func ResourceExistsInCache(scAddress string, resourceName string) (bool, error) {
	logger.Debugf("Checking if resource %s exists in cache for website %s", resourceName, scAddress)

	cache, err := cache.NewCache(cacheDir)
	if err != nil {
		return false, fmt.Errorf("failed to create cache: %w", err)
	}

	return cache.IsPresent(scAddress, resourceName), nil
}
