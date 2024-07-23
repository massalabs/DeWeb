package config

import (
	"github.com/massalabs/station-massa-wallet/pkg/utils"
	msConfig "github.com/massalabs/station/int/config"
	"github.com/massalabs/station/pkg/logger"
	"github.com/massalabs/station/pkg/node"
)

const (
	defaultMinimalFees = uint64(100_000_000)
	defaultMaxGas      = uint64(4_000_000_000)
	defaultMaxCoins    = uint64(10_000_000_000)
	defaultExpiry      = uint64(3)

	mainnetName  = "mainnet"
	buildnetName = "buildnet"

	MainnetChainID  = 77658377
	BuildnetChainID = 77658366
)

type Config struct {
	WalletNickname string
	MinimalFees    uint64
	MaxGas         uint64
	MaxCoins       uint64
	Expiry         uint64
	NetworkInfos   msConfig.NetworkInfos
}

// DefaultConfig returns a new Config with default values.
func DefaultConfig(walletNickname string, nodeURL string) *Config {
	return NewConfig(walletNickname, defaultMaxGas, defaultMaxCoins, defaultExpiry, nodeURL)
}

// NewConfig returns a new Config with information returned by the given node.
func NewConfig(walletNickname string, maxGas, maxCoins, expiry uint64, nodeURL string) *Config {
	client := node.NewClient(nodeURL)

	minimalFees := defaultMinimalFees
	chainID := uint64(0)
	networkName := "unknown"
	nodeVersion := "unknown"

	status, err := node.Status(client)
	if err != nil {
		logger.Errorf("unable to get node status: %v", err)
		logger.Warnf("Using default values for minimal fees, chain ID, and network version")
	} else {
		minimalFees = getMinimalFees(status)
		chainID, networkName = getChainIDAndNetworkName(status)
		nodeVersion = getNodeVersion(status)
	}

	return &Config{
		WalletNickname: walletNickname,
		MinimalFees:    minimalFees,
		MaxGas:         maxGas,
		MaxCoins:       maxCoins,
		Expiry:         expiry,
		NetworkInfos: msConfig.NetworkInfos{
			Network: networkName,
			NodeURL: nodeURL,
			Version: nodeVersion,
			ChainID: chainID,
		},
	}
}

func getNodeVersion(status *node.State) string {
	nodeVersion := "unknown"

	if status.Version != nil {
		nodeVersion = *status.Version
	} else {
		logger.Warnf("Node version is nil, setting '%s' as network version", nodeVersion)
	}

	return nodeVersion
}

func getChainIDAndNetworkName(status *node.State) (uint64, string) {
	chainID := uint64(0)
	networkName := "unknown"

	if status.ChainID != nil {
		chainID = uint64(*status.ChainID)
		switch chainID {
		case MainnetChainID:
			networkName = mainnetName
		case BuildnetChainID:
			networkName = buildnetName
		default:
			logger.Warnf("Unknown chain ID: %d", chainID)
		}
	}

	return chainID, networkName
}

func getMinimalFees(status *node.State) uint64 {
	minimalFees := defaultMinimalFees

	if status.MinimalFees != nil {
		statusMinimalFees, err := utils.MasToNano(*status.MinimalFees)
		if err != nil {
			logger.Errorf("unable to convert minimal fees: %v", err)
			logger.Warnf("Using default value of %dnMAS for minimal fees", minimalFees)
		} else {
			minimalFees = statusMinimalFees
		}
	}

	return minimalFees
}
