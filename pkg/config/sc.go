package config

import (
	"github.com/massalabs/station-massa-wallet/pkg/utils"
	"github.com/massalabs/station/pkg/logger"
	"github.com/massalabs/station/pkg/node"
)

type SCConfig struct {
	MinimalFees uint64
	MaxGas      uint64
	MaxCoins    uint64
	Expiry      uint64
}

const (
	DefaultMinimalFees = uint64(100_000_000)
	DefaultMaxGas      = uint64(3_980_167_295)
	DefaultMaxCoins    = uint64(10_000_000_000)
	DefaultExpiry      = uint64(3)
	NoCoins            = uint64(0)
)

// Returns a new Config for call sc's
func NewSCConfig(NodeURL string) SCConfig {
	client := node.NewClient(NodeURL)

	var minimalFees uint64

	status, err := node.Status(client)
	if err != nil {
		logger.Errorf("unable to get node status: %v", err)
	}

	minimalFees = getMinimalFees(status)

	return SCConfig{
		MinimalFees: minimalFees,
		MaxGas:      DefaultMaxGas,
		MaxCoins:    DefaultMaxCoins,
		Expiry:      DefaultExpiry,
	}
}

// returns minimal fees from node status
func getMinimalFees(status *node.State) uint64 {
	minimalFees := DefaultMinimalFees

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
