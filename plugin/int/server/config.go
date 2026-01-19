package server

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sync"

	"github.com/massalabs/deweb-server/int/api/config"
	serverErrors "github.com/massalabs/deweb-server/pkg/error"
	"github.com/massalabs/station/pkg/logger"
	"gopkg.in/yaml.v2"
)

const (
	defaultAPIPort = 0

	DefaultConfigFileName = "deweb_server_config.yaml"
)

type ServerConfigManager struct {
	serverConfig *config.ServerConfig
	mu           sync.Mutex
	configDir    string
	nodeName     string
}

// NewServerConfigManager creates a new ServerConfigManager
func NewServerConfigManager(configDir string) *ServerConfigManager {
	return &ServerConfigManager{
		configDir: configDir,
	}
}

// SaveServerConfig saves a ServerConfig to the given path
func (c *ServerConfigManager) SaveServerConfig(serverConfig *config.ServerConfig) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	if serverConfig == nil {
		return fmt.Errorf("new server config is nil, cannot save it")
	}

	yamlConfig := convertToYamlConfig(serverConfig)

	if err := saveYamlConfig(yamlConfig, getConfigPath(c.configDir)); err != nil {
		return fmt.Errorf("failed to save server config: %w", err)
	}

	// Update the cached server config
	if err := c.refreshServerConfig(); err != nil {
		return fmt.Errorf("saved new server config but failed to retrieve it from file for caching: %w", err)
	}

	return nil
}

func (c *ServerConfigManager) UpdateNodeName(nodeName string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.nodeName = nodeName
}

func (c *ServerConfigManager) GetNodeName() string {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.nodeName
}

// GetServerConfig returns the cached server config
func (c *ServerConfigManager) GetServerConfig() (*config.ServerConfig, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.serverConfig == nil {
		if err := c.refreshServerConfig(); err != nil {
			return nil, fmt.Errorf("failed to refresh server config: %w", err)
		}
	}

	return c.serverConfig, nil
}

func (c *ServerConfigManager) refreshServerConfig() error {
	serverConfig, err := loadConfig(getConfigPath(c.configDir))
	if err != nil {
		// If the error is due to the fact that node configured in config is down, load conf without node retrieved data
		if errors.Is(err, serverErrors.ErrNetworkConfig) {
			logger.Debug("the massa node used in deweb server config is down, loading config without node retrieved data")
			serverConfig, err = config.LoadConfigWhitoutNodeFetchedData(getConfigPath(c.configDir))
			if err != nil {
				return fmt.Errorf("failed to load config without node retrieved data, error: %w", err)
			}
		} else {
			return fmt.Errorf("failed to load server config, error: %w", err)
		}
	}

	c.serverConfig = serverConfig
	return nil
}

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
		AllowOffline:       serverConfig.AllowOffline,
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
