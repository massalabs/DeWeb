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

func LoadConfig(configPath string, nodeURL string, nickname string) (*Config, error) {
	if nodeURL == "" {
		logger.Warnf("Node URL is empty, using default value")
		nodeURL = CLIConfig.DefaultNodeURL
	}

	if configPath != "" {
		logger.Infof("Loading config from file: %s", configPath)
		return loadYamlCliConfig(configPath, nodeURL, nickname)
	}

	logger.Infof("No config file specified, using default values")

	return defaultCliConfig(nodeURL, nickname)
}

func defaultCliConfig(nodeURL string, nickname string) (*Config, error) {
	walletConfig := CLIConfig.NewWalletConfig(nickname, nodeURL)
	scConfig := CLIConfig.NewSCConfig(nodeURL)
	networkInfos := CLIConfig.NewNetworkConfig(nodeURL)

	return &Config{
		WalletConfig:  walletConfig,
		SCConfig:      scConfig,
		NetworkConfig: networkInfos,
	}, nil
}

func loadYamlCliConfig(configPath string, nodeURL string, nickname string) (*Config, error) {
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		logger.Warnf("Config file does not exist, using default values")
		return defaultCliConfig(nodeURL, nickname)
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

	if nickname != "" {
		logger.Warnf("Setting wallet nickname to: %s", nickname)
		yamlConf.WalletConfig.WalletNickname = nickname
	}

	if nodeURL != "" {
		logger.Warnf("Setting config node url to: %s", nodeURL)
		yamlConf.WalletConfig.NodeUrl = nodeURL
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
		MinimalFees: newScConfig.MinimalFees, // minimal fees is not in the yaml file
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
