package main

import (
	_ "embed"
	"fmt"
	"log"
	"os"
	"path/filepath"

	pluginConfig "github.com/massalabs/deweb-plugin/config"
	"github.com/massalabs/deweb-server/int/api"
	"github.com/massalabs/deweb-server/int/api/config"
	pkgConfig "github.com/massalabs/deweb-server/pkg/config"
	"github.com/massalabs/station/pkg/logger"
)

const directoryName = "station-deweb-plugin"

//go:embed home/dist/home.zip
var homeZip []byte

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

	// Load configuration from YAML file with fallback to defaults
	conf, err := pluginConfig.LoadConfig(pluginDir)
	if err != nil {
		logger.Warnf("%v", err)
	}

	// Convert PluginConfig to ServerConfig
	serverConfig := config.ServerConfig{
		APIPort:      conf.APIPort,
		Domain:       "localhost",
		NetworkInfos: pkgConfig.NewNetworkConfig(conf.NetworkURL),
		CacheConfig:  conf.CacheConfig,
	}

	logger.Infof("Starting DeWeb plugin with configuration:")
	logger.Infof("  API Port: %d", serverConfig.APIPort)
	logger.Infof("  Network URL: %s", serverConfig.NetworkInfos.NodeURL)
	logger.Infof("  Cache Directory: %s", serverConfig.CacheConfig.DiskCacheDir)

	api := api.NewPluginAPI(&serverConfig, homeZip)
	api.Start()
}

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
