package websiteManager

import (
	"fmt"
	"time"

	pkgConfig "github.com/massalabs/DeWeb/pkg/config"
	"github.com/massalabs/DeWeb/pkg/website"
	"github.com/massalabs/station/pkg/cache"
	"github.com/massalabs/station/pkg/logger"
)

// RequestWebsite fetches a website and caches it, or retrieves it from the cache if already present
func RequestWebsite(scAddress string, config *pkgConfig.Config) ([]byte, error) {
	cache := new(cache.Cache)
	fileName := fmt.Sprintf("website_%s.zip", scAddress)

	// fake last updated date
	lastUpdated := time.Now()

	// fake creation date
	creationDate := time.Now()

	shouldFetchWebsite := shouldFetch(fileName, cache, lastUpdated, creationDate)

	if !shouldFetchWebsite {
		logger.Debugf("Website %s present in cache and is up to date", scAddress)

		content, err := cache.Read(fileName)
		if err != nil {
			return nil, fmt.Errorf("failed to read cached website: %w", err)
		}

		return content, nil
	}

	logger.Debugf("Website %s not found in cache or not up to date, fetching...", scAddress)

	websiteBytes, err := website.Fetch(&config.NetworkInfos, scAddress)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch website: %w", err)
	}

	logger.Debugf("Website fetched successfully with size: %d bytes", len(websiteBytes))

	if err := cache.Save(fileName, websiteBytes); err != nil {
		return nil, fmt.Errorf("failed to save website to cache: %w", err)
	}

	logger.Debugf("Website successfully written to cache at: %s", fileName)

	return websiteBytes, nil
}

// if the lastUpdated timestamp changes then the website should be fetched again
func shouldFetch(fileName string, cache *cache.Cache, lastUpdated, creationDate time.Time) bool {
	isFilePresent := cache.IsPresent(fileName)
	isFileOutdated := lastUpdated.After(creationDate)

	if isFilePresent {
		logger.Debugf("Website found in cache: %s", fileName)
	} else {
		logger.Debugf("Website not found in cache: %s", fileName)
	}

	if isFileOutdated {
		logger.Infof("Website is outdated, fetching again: %s", fileName)
	} else {
		logger.Infof("Website is up to date, no need to fetch: %s", fileName)
	}

	return isFileOutdated || !isFilePresent
}
