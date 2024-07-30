package websiteManager

import (
	"fmt"

	pkgConfig "github.com/massalabs/DeWeb/pkg/config"
	"github.com/massalabs/DeWeb/pkg/website"
	"github.com/massalabs/station/pkg/cache"
	"github.com/massalabs/station/pkg/logger"
)

// RequestWebsite fetches a website and caches it, or retrieves it from the cache if already present
func RequestWebsite(scAddress string, config *pkgConfig.Config) ([]byte, error) {
	cache := new(cache.Cache)
	fileName := fmt.Sprintf("website_%s.zip", scAddress)

	if cache.IsPresent(fileName) {
		logger.Infof("Website found in cache at: %s", fileName)
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
