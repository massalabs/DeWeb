package main

import (
	_ "embed"
	"fmt"
	"log"
	"os"
	"path/filepath"

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

	conf := config.ServerConfig{
		APIPort:      0,
		Domain:       "localhost",
		NetworkInfos: pkgConfig.NewNetworkConfig("https://mainnet.massa.net/api/v2"),
		CacheDir:     filepath.Join(pluginDir, "websiteCache"),
	}

	api := api.NewPluginAPI(&conf, homeZip)
	api.Start()
}

func PluginDir() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", fmt.Errorf("getting user config directory: %w", err)
	}

	path := filepath.Join(configDir, directoryName)

	// create the directory if it doesn't exist
	if _, err := os.Stat(path); os.IsNotExist(err) {
		err = os.MkdirAll(path, os.ModePerm)
		if err != nil {
			return "", fmt.Errorf("creating account directory '%s': %w", path, err)
		}
	}

	return path, nil
}
