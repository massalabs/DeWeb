package server

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/massalabs/deweb-server/int/api/config"
	"github.com/massalabs/station/pkg/logger"
	"gopkg.in/yaml.v2"
)

const (
	defaultAPIPort = 0

	DefaultConfigFileName = "deweb_server_config.yaml"
)

// ensureConfigFileExists makes sure the config file exists, creating it with defaults if needed
func ensureConfigFileExists(configDir string) error {
	configPath := filepath.Join(configDir, DefaultConfigFileName)

	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		yamlConfig := createDefaultYamlConfig(configDir)

		if err := saveYamlConfig(yamlConfig, configPath); err != nil {
			return fmt.Errorf("failed to save default config: %w", err)
		}

		logger.Infof("Created default server config at: %s", configPath)
	}

	return nil
}

// createDefaultYamlConfig creates a default YAML config with proper paths
func createDefaultYamlConfig(configDir string) config.YamlServerConfig {
	domain := config.DefaultDomain
	networkNodeURL := config.DefaultNetworkNodeURL
	apiPort := defaultAPIPort

	yamlConfig := config.YamlServerConfig{
		Domain:         &domain,
		NetworkNodeURL: &networkNodeURL,
		APIPort:        &apiPort,
		AllowList:      []string{},
		BlockList:      []string{},
	}

	cacheDir := filepath.Join(configDir, "cache")
	if err := os.MkdirAll(cacheDir, 0o755); err != nil {
		logger.Errorf("Failed to create cache directory: %v", err)
	}

	enabled := true
	cacheDirPtr := cacheDir
	ramItems := config.DefaultMaxRAMItems
	diskItems := config.DefaultMaxDiskItems
	cacheDuration := config.DefaultFileListCachePeriod

	yamlConfig.CacheConfig = &config.YamlCacheConfig{
		Enabled:                      &enabled,
		DiskCacheDir:                 &cacheDirPtr,
		SiteRAMCacheMaxItems:         &ramItems,
		SiteDiskCacheMaxItems:        &diskItems,
		FileListCacheDurationSeconds: &cacheDuration,
	}

	return yamlConfig
}

// SaveServerConfig saves a ServerConfig to the given path
func SaveServerConfig(serverConfig *config.ServerConfig, configPath string) error {
	yamlConfig := convertToYamlConfig(serverConfig)

	return saveYamlConfig(yamlConfig, configPath)
}

// convertToYamlConfig converts a ServerConfig to YamlServerConfig
func convertToYamlConfig(serverConfig *config.ServerConfig) config.YamlServerConfig {
	if serverConfig == nil {
		return createDefaultYamlConfig("")
	}

	domain := serverConfig.Domain
	networkNodeURL := serverConfig.NetworkInfos.NodeURL
	apiPort := serverConfig.APIPort

	// Create YAML config from server config
	yamlConfig := config.YamlServerConfig{
		Domain:             &domain,
		NetworkNodeURL:     &networkNodeURL,
		APIPort:            &apiPort,
		AllowList:          serverConfig.AllowList,
		BlockList:          serverConfig.BlockList,
		MiscPublicInfoJson: serverConfig.MiscPublicInfoJson,
	}

	// Convert cache config to YAML format
	enabled := serverConfig.CacheConfig.Enabled
	diskCacheDir := serverConfig.CacheConfig.DiskCacheDir
	ramItems := serverConfig.CacheConfig.SiteRAMCacheMaxItems
	diskItems := serverConfig.CacheConfig.SiteDiskCacheMaxItems
	cacheDuration := serverConfig.CacheConfig.FileListCacheDurationSeconds

	yamlConfig.CacheConfig = &config.YamlCacheConfig{
		Enabled:                      &enabled,
		DiskCacheDir:                 &diskCacheDir,
		SiteRAMCacheMaxItems:         &ramItems,
		SiteDiskCacheMaxItems:        &diskItems,
		FileListCacheDurationSeconds: &cacheDuration,
	}

	return yamlConfig
}

// saveYamlConfig saves a YamlServerConfig to disk
func saveYamlConfig(yamlConfig config.YamlServerConfig, configPath string) error {
	if err := os.MkdirAll(filepath.Dir(configPath), 0o755); err != nil {
		return fmt.Errorf("failed to create config directory: %w", err)
	}

	yamlData, err := yaml.Marshal(yamlConfig)
	if err != nil {
		return fmt.Errorf("failed to marshal config to YAML: %w", err)
	}

	if err := os.WriteFile(configPath, yamlData, 0o644); err != nil {
		return fmt.Errorf("failed to write config file: %w", err)
	}

	return nil
}

// GetConfigPath returns the path to the server config file
func getConfigPath(configDir string) string {
	return filepath.Join(configDir, DefaultConfigFileName)
}

// loadConfig loads a ServerConfig from the given path
func loadConfig(configPath string) (*config.ServerConfig, error) {
	serverConfig, err := config.LoadServerConfig(configPath)
	if err != nil {
		return nil, fmt.Errorf("failed to load config: %w", err)
	}

	return serverConfig, nil
}
