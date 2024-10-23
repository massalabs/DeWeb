package webmanager

import (
	"fmt"
	"strings"
	"time"

	"github.com/massalabs/deweb-server/pkg/cache"
	"github.com/massalabs/deweb-server/pkg/website"
	msConfig "github.com/massalabs/station/int/config"
	"github.com/massalabs/station/pkg/logger"
)

const cacheDir = "./websitesCache/"

// getWebsiteResource fetches a resource from a website and returns its content.
func GetWebsiteResource(network *msConfig.NetworkInfos, websiteAddress, resourceName string) ([]byte, bool, error) {
	logger.Debugf("Getting website %s resource %s", websiteAddress, resourceName)

	content, err := RequestFile(websiteAddress, network, resourceName)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			return nil, true, fmt.Errorf("failed to get file %s from website %s: %w", resourceName, websiteAddress, err)
		}

		return nil, false, fmt.Errorf("failed to get file %s from website %s: %w", resourceName, websiteAddress, err)
	}

	logger.Debugf("Resource %s from %s successfully retrieved", resourceName, websiteAddress)

	return content, false, nil
}

// RequestFile fetches a website and caches it, or retrieves it from the cache if already present.
func RequestFile(scAddress string, networkInfo *msConfig.NetworkInfos, resourceName string) ([]byte, error) {
	cache, err := cache.NewCache(cacheDir)
	if err != nil {
		return nil, fmt.Errorf("failed to create cache: %w", err)
	}

	// TODO: LastUpdateTimestamp is not yet implemented in the new SC
	// lastUpdatedUint, err := website.GetLastUpdateTimestamp(networkInfo, scAddress)
	// if err != nil {
	// 	return nil, fmt.Errorf("failed to get last update timestamp: %w", err)
	// }

	// lastUpdated := time.UnixMilli(int64(lastUpdatedUint))

	if cache.IsPresent(scAddress, resourceName) {
		logger.Debugf("Resource %s from %s present in cache", resourceName, scAddress)

		// isOutdated, err := isFileOutdated(resourceName, lastUpdated)
		// if err != nil {
		// 	return nil, fmt.Errorf("failed to check if file is outdated: %w", err)
		// }

		// if !isOutdated {
		content, err := cache.Read(scAddress, resourceName)
		if err != nil {
			return nil, fmt.Errorf("failed to read cached resource %s from %s: %w", resourceName, scAddress, err)
		}

		return content, nil
		// }
		// logger.Warnf("website %s is outdated, fetching...", resourceName)
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
		if website.IsNotFoundError(err, resourceName) {
			return nil, fmt.Errorf("website %s not found: %w", scAddress, err)
		}

		return nil, fmt.Errorf("failed to fetch %s from %s: %w", resourceName, scAddress, err)
	}

	logger.Debugf("%s: %s successfully fetched with size: %d bytes", scAddress, resourceName, len(websiteBytes))

	if err := cache.Save(scAddress, resourceName, websiteBytes); err != nil {
		return nil, fmt.Errorf("failed to save %s to %s cache: %w", resourceName, scAddress, err)
	}

	logger.Infof("%s: %s successfully written to cache", scAddress, resourceName)

	return websiteBytes, nil
}

// Compares the last updated timestamp to the file's last modified timestamp.
//
//nolint:unused
func isFileOutdated(cache *cache.Cache, scAddress string, fileName string, lastUpdated time.Time) (bool, error) {
	lastModified, err := cache.GetLastModified(scAddress, fileName)
	if err != nil {
		return false, fmt.Errorf("failed to get file info: %w", err)
	}

	return lastModified.Before(lastUpdated), nil
}
