package config

import (
	"fmt"
	"os"

	"github.com/massalabs/deweb-server/int/utils"
	pkgConfig "github.com/massalabs/deweb-server/pkg/config"
	msConfig "github.com/massalabs/station/int/config"
	"gopkg.in/yaml.v2"
)

const (
	DefaultDomain         = "localhost"
	DefaultNetworkNodeURL = "https://mainnet.massa.net/api/v2"
	DefaultAPIPort        = 8080

	// Default cache size limits
	DefaultMaxRAMEntries                uint64 = 1000  // Maximum number of file entries in RAM cache
	DefaultMaxDiskEntries               uint64 = 10000 // Maximum number of file entries in disk cache
	DefaultFileListCacheDurationSeconds        = 60    // Default expiration of the file list cache
)

type ServerConfig struct {
	Domain                       string
	APIPort                      int
	NetworkInfos                 msConfig.NetworkInfos
	AllowList                    []string
	BlockList                    []string
	SiteRAMCacheMaxItems         uint64
	SiteDiskCacheMaxItems        uint64
	FileListCacheDurationSeconds int
}

type yamlServerConfig struct {
	Domain                       string   `yaml:"domain"`
	NetworkNodeURL               string   `yaml:"network_node_url"`
	APIPort                      int      `yaml:"api_port"`
	AllowList                    []string `yaml:"allow_list"`
	BlockList                    []string `yaml:"block_list"`
	SiteRAMCacheMaxItems         uint64   `yaml:"site_ram_cache_max_items"`
	SiteDiskCacheMaxItems        uint64   `yaml:"site_disk_cache_max_items"`
	FileListCacheDurationSeconds int      `yaml:"file_list_cache_duration_seconds"`
}

func DefaultConfig() *ServerConfig {
	networkInfos := pkgConfig.NewNetworkConfig(DefaultNetworkNodeURL)

	return &ServerConfig{
		Domain:                       DefaultDomain,
		APIPort:                      DefaultAPIPort,
		NetworkInfos:                 networkInfos,
		AllowList:                    []string{},
		BlockList:                    []string{},
		SiteRAMCacheMaxItems:         DefaultMaxRAMEntries,
		SiteDiskCacheMaxItems:        DefaultMaxDiskEntries,
		FileListCacheDurationSeconds: DefaultFileListCacheDurationSeconds,
	}
}

// LoadServerConfig loads the server configuration from the given path, or returns the default configuration
func LoadServerConfig(configPath string) (*ServerConfig, error) {
	if configPath == "" {
		return nil, fmt.Errorf("config path is empty")
	}

	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		return DefaultConfig(), nil
	}

	filebytes, err := utils.ReadFileBytes(configPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read file bytes: %w", err)
	}

	var yamlConf yamlServerConfig

	err = yaml.Unmarshal(filebytes, &yamlConf)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal YAML data: %w", err)
	}

	// Set default values if not specified in the YAML file
	if yamlConf.Domain == "" {
		yamlConf.Domain = DefaultDomain
	}

	if yamlConf.NetworkNodeURL == "" {
		yamlConf.NetworkNodeURL = DefaultNetworkNodeURL
	}

	if yamlConf.APIPort == 0 {
		yamlConf.APIPort = DefaultAPIPort
	}

	// Set default values for cache settings if not specified
	if yamlConf.SiteRAMCacheMaxItems == 0 {
		yamlConf.SiteRAMCacheMaxItems = DefaultMaxRAMEntries
	}

	if yamlConf.SiteDiskCacheMaxItems == 0 {
		yamlConf.SiteDiskCacheMaxItems = DefaultMaxDiskEntries
	}

	if yamlConf.FileListCacheDurationSeconds == 0 {
		yamlConf.FileListCacheDurationSeconds = DefaultFileListCacheDurationSeconds
	}

	networkInfos := pkgConfig.NewNetworkConfig(yamlConf.NetworkNodeURL)

	return &ServerConfig{
		Domain:                       yamlConf.Domain,
		APIPort:                      yamlConf.APIPort,
		NetworkInfos:                 networkInfos,
		AllowList:                    yamlConf.AllowList,
		BlockList:                    yamlConf.BlockList,
		SiteRAMCacheMaxItems:         yamlConf.SiteRAMCacheMaxItems,
		SiteDiskCacheMaxItems:        yamlConf.SiteDiskCacheMaxItems,
		FileListCacheDurationSeconds: yamlConf.FileListCacheDurationSeconds,
	}, nil
}
