package config

import (
	msConfig "github.com/massalabs/station/int/config"
	"github.com/massalabs/station/pkg/logger"
	"github.com/massalabs/station/pkg/node"
)

const (
	mainnetName  = "mainnet"
	buildnetName = "buildnet"

	MainnetChainID  = 77658377
	BuildnetChainID = 77658366
)

func NewNetworkConfig(NodeURL string) *msConfig.NetworkInfos {
	client := node.NewClient(NodeURL)

	chainID := uint64(0)
	networkName := "unknown"
	nodeVersion := "unknown"

	status, err := node.Status(client)
	if err != nil {
		logger.Errorf("unable to get node status: %v", err)
		logger.Warnf("Using default values for minimal fees, chain ID, and network version")
	} else {
		chainID, networkName = getChainIDAndNetworkName(status)
		nodeVersion = getNodeVersion(status)
	}

	return &msConfig.NetworkInfos{
		Network: networkName,
		NodeURL: NodeURL,
		Version: nodeVersion,
		ChainID: chainID,
	}
}

// Returns node version from node status
func getNodeVersion(status *node.State) string {
	nodeVersion := "unknown"

	if status.Version != nil {
		nodeVersion = *status.Version
	} else {
		logger.Warnf("Node version is nil, setting '%s' as network version", nodeVersion)
	}

	return nodeVersion
}

// Returns chain ID and network name from node status
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
