package main

import (
	_ "embed"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/massalabs/deweb-plugin/int/api"
	"github.com/massalabs/station/pkg/logger"
)

func main() {
	pluginDir, err := PluginDir()
	if err != nil {
		log.Fatalf("failed to get plugin directory: %v", err)
	}

	logPath := filepath.Join(pluginDir, "./deweb-plugin.log")

	err = logger.InitializeGlobal(logPath)
	if err != nil {
		log.Fatalf("failed to initialize logger: %v", err)
	}

	// Create and start the API with the plugin directory
	apiInstance := api.NewAPI(pluginDir)
	apiInstance.Start()

	logger.Warnf("DeWeb plugin stopped")
}

const directoryName = "station-deweb-plugin"

func PluginDir() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", fmt.Errorf("getting user config directory: %w", err)
	}

	path := filepath.Join(configDir, directoryName)

	_, err = os.Stat(path)
	if err != nil {
		if os.IsNotExist(err) {
			err = os.MkdirAll(path, os.ModePerm)
			if err != nil {
				return "", fmt.Errorf("creating account directory '%s': %w", path, err)
			}
		} else {
			return "", fmt.Errorf("checking directory '%s': %w", path, err)
		}
	}

	return path, nil
}
