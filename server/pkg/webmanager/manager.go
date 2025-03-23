package webmanager

import (
	"fmt"
	"time"

	"github.com/massalabs/deweb-server/pkg/cache"
	"github.com/massalabs/deweb-server/pkg/website"
	msConfig "github.com/massalabs/station/int/config"
	"github.com/massalabs/station/pkg/logger"
)

const cacheDir = "./websitesCache/"

// Default cache size limits
const (
	defaultMaxRAMEntries  = 1000  // Maximum number of entries in RAM cache
	defaultMaxDiskEntries = 10000 // Maximum number of entries in disk cache
)

// getWebsiteResource fetches a resource from a website and returns its content.
func GetWebsiteResource(network *msConfig.NetworkInfos, websiteAddress, resourceName string) ([]byte, error) {
	startTime := time.Now()
	logger.Debugf("Getting website %s resource %s", websiteAddress, resourceName)

	content, err := RequestFile(websiteAddress, network, resourceName)
	if err != nil {
		logger.Debugf("GetWebsiteResource failed after %v", time.Since(startTime))
		return nil, fmt.Errorf("failed to get file %s from website %s: %w", resourceName, websiteAddress, err)
	}

	logger.Debugf("Resource %s from %s successfully retrieved in %v", resourceName, websiteAddress, time.Since(startTime))
	return content, nil
}

// RequestFile fetches a website and caches it, or retrieves it from the cache if already present.
func RequestFile(scAddress string, networkInfo *msConfig.NetworkInfos, resourceName string) ([]byte, error) {
	startTime := time.Now()
	cache, err := cache.NewCache(cacheDir, defaultMaxRAMEntries, defaultMaxDiskEntries)
	if err != nil {
		logger.Errorf("Failed to create cache: %v", err)
	}

	// Get the last update timestamp from the website
	timestampStart := time.Now()
	lastUpdated, err := website.GetLastUpdateTimestamp(networkInfo, scAddress)
	if err != nil {
		logger.Warnf("Failed to get last update timestamp: %v", err)
	} else if cache != nil {
		lastModified, err := cache.GetLastModified(scAddress, resourceName)
		if err != nil {
			logger.Debugf("Resource %s from %s not in cache", resourceName, scAddress)
		} else if !lastModified.Before(*lastUpdated) {
			cacheStart := time.Now()
			content, err := cache.Read(scAddress, resourceName)
			if err != nil {
				logger.Warnf("Failed to read cached resource %s from %s: %v", resourceName, scAddress, err)
			} else {
				logger.Debugf("Cache read took %v", time.Since(cacheStart))
				logger.Debugf("RequestFile completed in %v (cache hit)", time.Since(startTime))
				return content, nil
			}
		} else {
			if err = cache.Delete(scAddress, resourceName); err != nil {
				logger.Warnf("Failed to delete outdated resource %s from %s: %v", resourceName, scAddress, err)
			}
			logger.Warnf("website %s is outdated, fetching...", resourceName)
		}
	}
	logger.Debugf("Timestamp check took %v", time.Since(timestampStart))

	logger.Debugf("Website %s not found in cache or not up to date, fetching...", scAddress)

	// Fetch the website content
	fetchStart := time.Now()
	websiteBytes, err := website.Fetch(networkInfo, scAddress, resourceName)
	if err != nil {
		logger.Debugf("RequestFile failed after %v", time.Since(startTime))
		return nil, fmt.Errorf("failed to fetch %s from %s: %w", resourceName, scAddress, err)
	}
	logger.Debugf("Website fetch took %v", time.Since(fetchStart))

	logger.Debugf("%s: %s successfully fetched with size: %d bytes", scAddress, resourceName, len(websiteBytes))

	// Save to cache if available
	if cache != nil {
		cacheStart := time.Now()
		err = cache.Save(scAddress, resourceName, websiteBytes, *lastUpdated)
		if err != nil {
			logger.Warnf("Failed to save %s to %s cache: %v", resourceName, scAddress, err)
		} else {
			logger.Infof("%s: %s successfully written to cache in %v", scAddress, resourceName, time.Since(cacheStart))
		}
	}

	logger.Debugf("RequestFile completed in %v", time.Since(startTime))
	return websiteBytes, nil
}

func ResourceExistsOnChain(network *msConfig.NetworkInfos, websiteAddress, filePath string) (bool, error) {
	logger.Debugf("Checking if file %s exists on chain for website %s", filePath, websiteAddress)

	isPresent, err := website.FilePathExists(network, websiteAddress, filePath)
	if err != nil {
		return false, fmt.Errorf("checking if file is present on chain: %w", err)
	}

	return isPresent, nil
}
