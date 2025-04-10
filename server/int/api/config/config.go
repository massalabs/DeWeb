package config

import (
	"fmt"
	"os"

	"github.com/massalabs/deweb-server/int/utils"
	pkgConfig "github.com/massalabs/deweb-server/pkg/config"
	msConfig "github.com/massalabs/station/int/config"
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
	NetworkInfos       msConfig.NetworkInfos
	AllowList          []string
	BlockList          []string
	MiscPublicInfoJson interface{}
	CacheConfig        CacheConfig
}

type yamlServerConfig struct {
	Domain             string           `yaml:"domain"`
	NetworkNodeURL     string           `yaml:"network_node_url"`
	APIPort            int              `yaml:"api_port"`
	AllowList          []string         `yaml:"allow_list"`
	BlockList          []string         `yaml:"block_list"`
	MiscPublicInfoJson interface{}      `yaml:"misc_public_info"`
	CacheConfig        *YamlCacheConfig `yaml:"cache"`
}

func DefaultConfig() *ServerConfig {
	networkInfos := pkgConfig.NewNetworkConfig(DefaultNetworkNodeURL)

	return &ServerConfig{
		Domain:             DefaultDomain,
		APIPort:            DefaultAPIPort,
		NetworkInfos:       networkInfos,
		AllowList:          []string{},
		BlockList:          []string{},
		MiscPublicInfoJson: map[string]interface{}{},
		CacheConfig:        DefaultCacheConfig(),
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

	// Convert YAML config to ServerConfig
	config := &ServerConfig{
		Domain:             yamlConf.Domain,
		APIPort:            yamlConf.APIPort,
		NetworkInfos:       pkgConfig.NewNetworkConfig(yamlConf.NetworkNodeURL),
		AllowList:          yamlConf.AllowList,
		BlockList:          yamlConf.BlockList,
		MiscPublicInfoJson: convertYamlMisc2Json(yamlConf.MiscPublicInfoJson),
		CacheConfig:        ConvertYamlCacheConfig(yamlConf.CacheConfig),
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
