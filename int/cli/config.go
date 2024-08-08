package config

import (
	"fmt"
	"os"

	dewebUtils "github.com/massalabs/DeWeb/int/utils"
	CLIConfig "github.com/massalabs/DeWeb/pkg/config"
	msConfig "github.com/massalabs/station/int/config"
	"github.com/massalabs/station/pkg/logger"
	"gopkg.in/yaml.v2"
)

type yamlWalletConfig struct {
	WalletNickname string `yaml:"wallet_nickname"`
	NodeUrl        string `yaml:"node_url"`
}

type yamlScConfig struct {
	MaxGas   uint64 `yaml:"max_gas"`
	MaxCoins uint64 `yaml:"max_coins"`
	Expiry   uint64 `yaml:"expiry"`
}

type yamlConfig struct {
	WalletConfig *yamlWalletConfig `yaml:"wallet_config"`
	ScConfig     *yamlScConfig     `yaml:"sc_config"`
}
type Config struct {
	WalletConfig  CLIConfig.WalletConfig
	SCConfig      CLIConfig.SCConfig
	NetworkConfig msConfig.NetworkInfos
}

// Load yaml cli config
func LoadYamlCliConfig(configPath string) (*Config, error) {
	if configPath == "" {
		return nil, fmt.Errorf("config path is empty")
	}

	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		logger.Warnf("Config file does not exist, using default values")
		walletConfig := CLIConfig.NewWalletConfig("", CLIConfig.DefaultNodeURL) // TODO change this
		scConfig := CLIConfig.NewSCConfig(CLIConfig.DefaultNodeURL)
		networkInfos := CLIConfig.NewNetworkConfig(CLIConfig.DefaultNodeURL)

		return &Config{
			WalletConfig:  walletConfig,
			SCConfig:      scConfig,
			NetworkConfig: networkInfos,
		}, nil

	}

	filebytes, err := dewebUtils.ReadFileBytes(configPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read file bytes: %w", err)
	}

	var yamlConf yamlConfig

	err = yaml.Unmarshal(filebytes, &yamlConf)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal YAML data: %w", err)
	}

	// Set default values if not specified in the YAML file
	if yamlConf.WalletConfig.WalletNickname == "" {
		logger.Warnf("Wallet nickname is empty, using default value")
		yamlConf.WalletConfig.WalletNickname = ""
	}

	if yamlConf.WalletConfig.NodeUrl == "" {
		logger.Warnf("Node URL is empty, using default value")
		yamlConf.WalletConfig.NodeUrl = CLIConfig.DefaultNodeURL
	}

	newScConfig := CLIConfig.NewSCConfig(yamlConf.WalletConfig.NodeUrl)

	if yamlConf.ScConfig.MaxGas == 0 {
		logger.Warnf("Max gas is empty, using default value")
		yamlConf.ScConfig.MaxGas = newScConfig.MaxGas
	}

	if yamlConf.ScConfig.MaxCoins == 0 {
		logger.Warnf("Max coins is empty, using default value")
		yamlConf.ScConfig.MaxCoins = newScConfig.MaxCoins
	}

	if yamlConf.ScConfig.Expiry == 0 {
		logger.Warnf("Expiry is empty, using default value")
		yamlConf.ScConfig.Expiry = newScConfig.Expiry
	}

	walletConfig := CLIConfig.WalletConfig{
		WalletNickname: yamlConf.WalletConfig.WalletNickname,
		NodeUrl:        yamlConf.WalletConfig.NodeUrl,
	}

	scConfig := CLIConfig.SCConfig{
		MinimalFees: newScConfig.MinimalFees,
		MaxGas:      yamlConf.ScConfig.MaxGas,
		MaxCoins:    yamlConf.ScConfig.MaxCoins,
		Expiry:      yamlConf.ScConfig.Expiry,
	}

	networkInfos := CLIConfig.NewNetworkConfig(yamlConf.WalletConfig.NodeUrl)

	return &Config{
		WalletConfig:  walletConfig,
		SCConfig:      scConfig,
		NetworkConfig: networkInfos,
	}, nil
}
