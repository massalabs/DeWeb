package website

import (
	_ "embed"
	"fmt"

	pkgConfig "github.com/massalabs/deweb-server/pkg/config"
	msConfig "github.com/massalabs/station/int/config"
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

func Deploy(walletNickname string, networkInfos *msConfig.NetworkInfos, scConfig *pkgConfig.SCConfig) (*DeploymentResult, error) {
	res, evt, err := onchain.DeploySC(
		networkInfos,
		walletNickname,
		scConfig.MaxGas,
		scConfig.MaxCoins,
		scConfig.MinimalFees,
		scConfig.Expiry,
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
