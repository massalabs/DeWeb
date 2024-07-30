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

	if shouldFetchWebsite {
		content, err := cache.Read(fileName)
		if err != nil {
			return nil, fmt.Errorf("failed to read cached website: %w", err)
		}

		return content, nil
	}

	logger.Infof("Website not found in cache, fetching from network: %s", fileName)

	websiteBytes, err := website.Fetch(&config.NetworkInfos, scAddress)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch website: %w", err)
	}

	logger.Infof("Website fetched successfully with size: %d bytes", len(websiteBytes))

	if err := cache.Save(fileName, websiteBytes); err != nil {
		return nil, fmt.Errorf("failed to save website to cache: %w", err)
	}

	logger.Infof("Website successfully written to cache at: %s", fileName)

	return websiteBytes, nil
}

// if the lastUpdated timestamp changes then the website should be fetched again
func shouldFetch(fileName string, cache *cache.Cache, lastUpdated time.Time, creationDate time.Time) bool {
	if cache.IsPresent(fileName) && creationDate == lastUpdated {
		logger.Infof("Website found in cache at: %s", fileName)

		return true

	}

	return false
}
