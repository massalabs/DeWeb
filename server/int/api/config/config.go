package config

import (
	"fmt"
	"os"

	"github.com/massalabs/deweb-server/int/utils"
	pkgConfig "github.com/massalabs/deweb-server/pkg/config"
	"github.com/massalabs/station/pkg/logger"
	yaml "gopkg.in/yaml.v2"
)

const (
	DefaultDomain         = "localhost"
	DefaultNetworkNodeURL = "https://mainnet.massa.net/api/v2"
	DefaultAPIPort        = 8080
)

type ServerConfig struct {
	Domain             string
	APIPort            int
	NetworkInfos       pkgConfig.NetworkInfos
	AllowList          []string
	BlockList          []string
	MiscPublicInfoJson interface{}
	CacheConfig        CacheConfig
}

type YamlServerConfig struct {
	Domain             *string          `yaml:"domain,omitempty"`
	NetworkNodeURL     *string          `yaml:"network_node_url,omitempty"`
	APIPort            *int             `yaml:"api_port,omitempty"`
	AllowList          []string         `yaml:"allow_list,omitempty"`
	BlockList          []string         `yaml:"block_list,omitempty"`
	MiscPublicInfoJson interface{}      `yaml:"misc_public_info,omitempty"`
	CacheConfig        *YamlCacheConfig `yaml:"cache,omitempty"`
	AllowOffline       bool             `yaml:"allow_offline,omitempty"`
}

func DefaultConfig() (*ServerConfig, error) {
	networkInfos, err := pkgConfig.NewNetworkConfig(DefaultNetworkNodeURL)
	if err != nil {
		return nil, fmt.Errorf("failed to create network config: %w", err)
	}

	return &ServerConfig{
		Domain:             DefaultDomain,
		APIPort:            DefaultAPIPort,
		NetworkInfos:       networkInfos,
		AllowList:          []string{},
		BlockList:          []string{},
		MiscPublicInfoJson: map[string]interface{}{},
		CacheConfig:        DefaultCacheConfig(),
	}, nil
}

// LoadServerConfig loads the server configuration from the given path, or returns the default configuration
func LoadServerConfig(configPath string) (*ServerConfig, error) {
	if configPath == "" {
		return nil, fmt.Errorf("config path is empty")
	}

	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		defaultConfig, err := DefaultConfig()
		if err != nil {
			return nil, fmt.Errorf("failed to create default config: %w", err)
		}
		// Process cache config with empty configPath for defaults
		defaultConfig.CacheConfig = ProcessCacheConfig(nil, "")

		return defaultConfig, nil
	}

	filebytes, err := utils.ReadFileBytes(configPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read file bytes: %w", err)
	}

	var yamlConf YamlServerConfig

	err = yaml.Unmarshal(filebytes, &yamlConf)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal YAML data: %w", err)
	}

	domain := DefaultDomain
	networkNodeURL := DefaultNetworkNodeURL
	apiPort := DefaultAPIPort

	// Set default values if not specified in the YAML file
	if yamlConf.Domain != nil {
		domain = *yamlConf.Domain
	}

	if yamlConf.NetworkNodeURL != nil {
		networkNodeURL = *yamlConf.NetworkNodeURL
	}

	if yamlConf.APIPort != nil {
		apiPort = *yamlConf.APIPort
	}

	networkInfos, err := pkgConfig.NewNetworkConfig(networkNodeURL)
	if err != nil {
		if yamlConf.AllowOffline {
			logger.Errorf("unable retrieve network config: %v", err)
			logger.Warnf("using default values for minimal fees, chain ID, and network version")
		} else {
			return nil, fmt.Errorf("failed to create network config: %w", err)
		}
	}

	// Process cache configuration
	cacheConfig := ProcessCacheConfig(yamlConf.CacheConfig, configPath)

	config := &ServerConfig{
		Domain:             domain,
		APIPort:            apiPort,
		NetworkInfos:       networkInfos,
		AllowList:          yamlConf.AllowList,
		BlockList:          yamlConf.BlockList,
		MiscPublicInfoJson: convertYamlMisc2Json(yamlConf.MiscPublicInfoJson),
		CacheConfig:        cacheConfig,
	}

	return config, nil
}

/*
convertYamlMisc2Json convert the config's "misc" json field from a
map[interface{}]interface{} (as unmarshaled by yaml.Unmarshal function)
format to a map[string]interface{} one.
The input is expected to represent valid json.
*/
func convertYamlMisc2Json(input interface{}) interface{} {
	switch x := input.(type) {
	case map[interface{}]interface{}:
		result := make(map[string]interface{})
		for k, v := range x {
			result[fmt.Sprint(k)] = convertYamlMisc2Json(v)
		}

		return result

	case []interface{}:
		for i, val := range x {
			x[i] = convertYamlMisc2Json(val)
		}

		return x

	case string:
		return input.(string)

	default:
		return input
	}
}
