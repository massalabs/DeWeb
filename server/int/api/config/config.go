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
)

type ServerConfig struct {
	Domain       string
	APIPort      int
	NetworkInfos msConfig.NetworkInfos
	CacheDir     string
	AllowList    []string
	BlockList    []string
}

type yamlServerConfig struct {
	Domain         string   `yaml:"domain"`
	NetworkNodeURL string   `yaml:"network_node_url"`
	APIPort        int      `yaml:"api_port"`
	CacheDir       string   `yaml:"cache_dir"`
	AllowList      []string `yaml:"allow_list"`
	BlockList      []string `yaml:"block_list"`
}

func DefaultConfig() *ServerConfig {
	networkInfos := pkgConfig.NewNetworkConfig(DefaultNetworkNodeURL)

	return &ServerConfig{
		Domain:       DefaultDomain,
		APIPort:      DefaultAPIPort,
		NetworkInfos: networkInfos,
		CacheDir:     "",
		AllowList:    []string{},
		BlockList:    []string{},
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

	networkInfos := pkgConfig.NewNetworkConfig(yamlConf.NetworkNodeURL)

	return &ServerConfig{
		Domain:       yamlConf.Domain,
		APIPort:      yamlConf.APIPort,
		NetworkInfos: networkInfos,
		CacheDir:     yamlConf.CacheDir,
		AllowList:    yamlConf.AllowList,
		BlockList:    yamlConf.BlockList,
	}, nil
}
