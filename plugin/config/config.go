package config

import (
	"fmt"
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

const (
	DefaultNetworkURL = "https://mainnet.massa.net/api/v2"
	DefaultCacheDir   = "websiteCache"
	ConfigFileName    = "config.yaml"
)

// PluginConfig represents the configuration for the DeWeb plugin
type PluginConfig struct {
	APIPort    int    `yaml:"api_port"`
	NetworkURL string `yaml:"network_url"`
	CacheDir   string `yaml:"cache_dir"`
}

// LoadConfig loads the configuration from a YAML file
// It falls back to default values if the file doesn't exist or if values are missing
func LoadConfig(pluginDir string) (PluginConfig, error) {
	config := PluginConfig{
		APIPort:    0, // Default port (0 means a random port will be assigned by OS)
		NetworkURL: DefaultNetworkURL,
		CacheDir:   filepath.Join(pluginDir, DefaultCacheDir),
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
func loadFromFile(configPath string) (PluginConfig, error) {
	var pluginConfig PluginConfig

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
func mergeConfig(source PluginConfig, target *PluginConfig, pluginDir string) {
	if source.APIPort != 0 {
		target.APIPort = source.APIPort
	}

	if source.NetworkURL != "" {
		target.NetworkURL = source.NetworkURL
	}

	if source.CacheDir != "" {
		if filepath.IsAbs(source.CacheDir) {
			target.CacheDir = source.CacheDir
		} else {
			target.CacheDir = filepath.Join(pluginDir, source.CacheDir)
		}
	}
}
