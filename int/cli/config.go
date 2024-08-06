package config

import (
	"fmt"
	"os"

	dewebUtils "github.com/massalabs/DeWeb/int/utils"
	pkgConfig "github.com/massalabs/DeWeb/pkg/config"
	"github.com/massalabs/station/pkg/logger"
	"gopkg.in/yaml.v2"
)

type yamlWalletConfig struct {
	WalletNickname string `yaml:"wallet_nickname"`
	NodeUrl        string `yaml:"node_url"`
}

type yamlScConfig struct {
	MinimalFees uint64 `yaml:"minimal_fees"`
	MaxGas      uint64 `yaml:"max_gas"`
	MaxCoins    uint64 `yaml:"max_coins"`
	Expiry      uint64 `yaml:"expiry"`
}

type yamlConfig struct {
	WalletConfig *yamlWalletConfig `yaml:"wallet_config"`
	ScConfig     *yamlScConfig     `yaml:"sc_config"`
}
type Config struct {
	WalletConfig *pkgConfig.WalletConfig
	ScConfig     *pkgConfig.SCConfig
}

// Load yaml cli config
func LoadYamlCliConfig(configPath string) (*pkgConfig.WalletConfig, *pkgConfig.SCConfig, error) {
	if configPath == "" {
		return nil, nil, fmt.Errorf("config path is empty")
	}

	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		logger.Warnf("Config file does not exist, using default values")
		return pkgConfig.DefaultWalletConfig(), pkgConfig.NewSCConfig(pkgConfig.DefaultNodeURL), nil
	}

	filebytes, err := dewebUtils.ReadFileBytes(configPath)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to read file bytes: %w", err)
	}

	var yamlConf yamlConfig

	err = yaml.Unmarshal(filebytes, &yamlConf)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to unmarshal YAML data: %w", err)
	}

	// Set default values if not specified in the YAML file
	if yamlConf.WalletConfig.WalletNickname == "" {
		logger.Warnf("Wallet nickname is empty, using default value")
		yamlConf.WalletConfig.WalletNickname = ""
	}

	if yamlConf.WalletConfig.NodeUrl == "" {
		logger.Warnf("Node URL is empty, using default value")
		yamlConf.WalletConfig.NodeUrl = pkgConfig.DefaultNodeURL
	}

	if yamlConf.ScConfig.MaxGas == 0 {
		logger.Warnf("Max gas is empty, using default value")
		yamlConf.ScConfig.MaxGas = pkgConfig.DefaultMaxGas
	}

	if yamlConf.ScConfig.MaxCoins == 0 {
		logger.Warnf("Max coins is empty, using default value")
		yamlConf.ScConfig.MaxCoins = pkgConfig.DefaultMaxCoins
	}

	if yamlConf.ScConfig.Expiry == 0 {
		logger.Warnf("Expiry is empty, using default value")
		yamlConf.ScConfig.Expiry = pkgConfig.DefaultExpiry
	}

	return &pkgConfig.WalletConfig{
			WalletNickname: yamlConf.WalletConfig.WalletNickname,
			NodeUrl:        yamlConf.WalletConfig.NodeUrl,
		}, &pkgConfig.SCConfig{
			MinimalFees: yamlConf.ScConfig.MinimalFees,
			MaxGas:      yamlConf.ScConfig.MaxGas,
			MaxCoins:    yamlConf.ScConfig.MaxCoins,
			Expiry:      yamlConf.ScConfig.Expiry,
		}, nil
}
