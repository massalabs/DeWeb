package website

import (
	"fmt"

	pkgConfig "github.com/massalabs/DeWeb/pkg/config"
	"github.com/massalabs/station/pkg/cache"
	"github.com/massalabs/station/pkg/logger"
)

func CheckWebsiteCache(scAddress string, config *pkgConfig.Config) ([]byte, error) {
	cache := new(cache.Cache)

	websiteBytes, err := Fetch(&config.NetworkInfos, scAddress)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch website: %v", err)
	}

	logger.Infof("Website fetched successfully with size: %d", len(websiteBytes))

	fileName := fmt.Sprintf("website_%s.zip", scAddress)

	isWebsitePresent := cache.IsPresent(fileName)
	if !isWebsitePresent {
		logger.Infof("Website was not found in cache at: %s", fileName)

		err := cache.Save(fileName, websiteBytes)
		if err != nil {
			return nil, fmt.Errorf("failed to write website zip file %v", err)
		}

		logger.Infof("Website successfully written in cache at: %s", fileName)
	} else {
		logger.Infof("Website was found in cache at: %s", fileName)
	}

	content, err := cache.Read(fileName)
	if err != nil {
		return nil, fmt.Errorf("failed to read cached website: %v", err)
	}

	return content, nil
}
