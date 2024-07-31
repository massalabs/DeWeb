package webmanager

import (
	"fmt"
	"os"
	"time"

	"github.com/massalabs/DeWeb/pkg/website"
	"github.com/massalabs/station/int/config"
	"github.com/massalabs/station/pkg/cache"
	"github.com/massalabs/station/pkg/logger"
)

// RequestWebsite fetches a website and caches it, or retrieves it from the cache if already present.
func RequestWebsite(scAddress string, networkInfo *config.NetworkInfos) ([]byte, error) {
	cache := new(cache.Cache)
	fileName := fmt.Sprintf("website_%s.zip", scAddress)

	// TODO: get last updated from callSc
	lastUpdated := time.Now()

	if cache.IsPresent(fileName) {
		logger.Debugf("Website %s present in cache", scAddress)

		isOutdated, err := isFileOutdated(fileName, lastUpdated)
		if err != nil {
			return nil, fmt.Errorf("failed to check if file is outdated: %w", err)
		}

		if !isOutdated {
			content, err := cache.Read(fileName)
			if err != nil {
				return nil, fmt.Errorf("failed to read cached website: %w", err)
			}

			return content, nil
		}

		logger.Warnf("website %s is outdated, fetching...", fileName)
	}

	logger.Debugf("Website %s not found in cache or not up to date, fetching...", scAddress)

	websiteBytes, err := fetchAndCache(networkInfo, scAddress, cache, fileName)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch and cache website: %w", err)
	}

	return websiteBytes, nil
}

// Fetches the website and saves it to the cache.
func fetchAndCache(networkInfo *config.NetworkInfos, scAddress string, cache *cache.Cache, fileName string) ([]byte, error) {
	websiteBytes, err := website.Fetch(networkInfo, scAddress)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch website: %w", err)
	}

	logger.Debugf("Website fetched successfully with size: %d bytes", len(websiteBytes))

	if err := cache.Save(fileName, websiteBytes); err != nil {
		return nil, fmt.Errorf("failed to save website to cache: %w", err)
	}

	logger.Infof("Website successfully written to cache at: %s", fileName)

	return websiteBytes, nil
}

// Compares the last updated timestamp to the file's last modified timestamp.
func isFileOutdated(fileName string, lastUpdated time.Time) (bool, error) {
	fi, err := os.Stat("./websitesCache/" + fileName)
	if err != nil {
		return false, fmt.Errorf("failed to get file info: %w", err)
	}

	return fi.ModTime().Before(lastUpdated), nil
}
