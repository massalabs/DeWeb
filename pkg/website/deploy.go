package website

import (
	_ "embed"
	"fmt"

	"github.com/massalabs/DeWeb/int/config"
	"github.com/massalabs/station/pkg/node/sendoperation"
	"github.com/massalabs/station/pkg/node/sendoperation/signer"
	"github.com/massalabs/station/pkg/onchain"
)

//go:embed sc/websiteDeployer.wasm
var sc []byte

type DeploymentResult struct {
	Address     string
	OperationID string
}

func Deploy(config *config.Config) (*DeploymentResult, error) {
	res, evt, err := onchain.DeploySC(
		&config.NetworkInfos,
		config.WalletNickname,
		config.MaxGas,
		config.MaxCoins,
		config.MinimalFees,
		config.Expiry,
		sc,
		nil,
		sendoperation.OperationBatch{},
		&signer.WalletPlugin{},
		"Deploying website contract",
	)
	if err != nil {
		return nil, fmt.Errorf("deploying website contract: %w", err)
	}

	address, found := onchain.FindDeployedAddress(evt)
	if !found {
		return nil, fmt.Errorf("deployed contract address not found")
	}

	return &DeploymentResult{
		Address:     address,
		OperationID: res.OperationID,
	}, nil
}
