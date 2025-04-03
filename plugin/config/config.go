package config

import (
	"fmt"
	"os"
	"path/filepath"

	apiConfig "github.com/massalabs/deweb-server/int/api/config"
	"gopkg.in/yaml.v2"
)

const (
	DefaultNetworkURL = "https://mainnet.massa.net/api/v2"
	DefaultCacheDir   = "websiteCache"
	ConfigFileName    = "config.yaml"
)

// PluginConfig represents the configuration for the DeWeb plugin
type PluginConfig struct {
	APIPort     int
	NetworkURL  string
	CacheConfig apiConfig.CacheConfig
}

type YamlPluginConfig struct {
	APIPort     *int                      `yaml:"api_port"`
	NetworkURL  string                    `yaml:"network_url"`
	CacheConfig apiConfig.YamlCacheConfig `yaml:"cache"`
}

// LoadConfig loads the configuration from a YAML file
// It falls back to default values if the file doesn't exist or if values are missing
func LoadConfig(pluginDir string) (PluginConfig, error) {
	config := PluginConfig{
		APIPort:    0, // Default port (0 means a random port will be assigned by OS)
		NetworkURL: DefaultNetworkURL,
		CacheConfig: apiConfig.CacheConfig{
			DiskCacheDir:                 filepath.Join(pluginDir, DefaultCacheDir),
			SiteRAMCacheMaxItems:         apiConfig.DefaultMaxRAMUsageMB,
			SiteDiskCacheMaxItems:        apiConfig.DefaultMaxDiskUsageMB,
			FileListCacheDurationSeconds: apiConfig.DefaultFileListCachePeriod,
		},
	}

	configPath := filepath.Join(pluginDir, ConfigFileName)
	fileConfig, err := loadFromFile(configPath)
	if err != nil {
		return config, fmt.Errorf("using default configuration: %w", err)
	}

	mergeConfig(fileConfig, &config, pluginDir)
	return config, nil
}

// loadFromFile attempts to load config from a file
// Returns the loaded config and an error if loading failed
func loadFromFile(configPath string) (YamlPluginConfig, error) {
	var pluginConfig YamlPluginConfig

	// Check if config file exists
	_, err := os.Stat(configPath)
	if os.IsNotExist(err) {
		return pluginConfig, fmt.Errorf("config file not found at %s", configPath)
	} else if err != nil {
		return pluginConfig, fmt.Errorf("error checking config file: %w", err)
	}

	// Read config file
	yamlFile, err := os.ReadFile(configPath)
	if err != nil {
		return pluginConfig, fmt.Errorf("error reading config file: %w", err)
	}

	// Parse YAML
	err = yaml.Unmarshal(yamlFile, &pluginConfig)
	if err != nil {
		return pluginConfig, fmt.Errorf("error parsing config file: %w", err)
	}

	return pluginConfig, nil
}

// mergeConfig applies non-empty values from source to target
// Handles both absolute and relative paths for CacheDir
func mergeConfig(source YamlPluginConfig, target *PluginConfig, pluginDir string) {
	if source.APIPort != nil {
		target.APIPort = *source.APIPort
	}

	if source.NetworkURL != "" {
		target.NetworkURL = source.NetworkURL
	}

	cacheConfig := apiConfig.ConvertYamlCacheConfig(&source.CacheConfig)
	target.CacheConfig = cacheConfig

	if !filepath.IsAbs(target.CacheConfig.DiskCacheDir) {
		target.CacheConfig.DiskCacheDir = filepath.Join(pluginDir, target.CacheConfig.DiskCacheDir)
	}
}
