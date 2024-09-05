package website

import (
	_ "embed"
	"fmt"

	"github.com/massalabs/deweb-server/pkg/config"
	msConfig "github.com/massalabs/station/int/config"
	"github.com/massalabs/station/pkg/node/sendoperation"
	"github.com/massalabs/station/pkg/node/sendoperation/signer"
	"github.com/massalabs/station/pkg/onchain"
)

func Delete(scConfig *config.SCConfig,
	walletConfig config.WalletConfig,
	networkInfos *msConfig.NetworkInfos, address string,
) (*string, error) {
	res, err := onchain.CallFunction(
		networkInfos,
		walletConfig.WalletNickname,
		address,
		"deleteWebsite",
		[]byte{},
		scConfig.MinimalFees,
		scConfig.MaxGas,
		config.NoCoins,
		scConfig.Expiry,
		false,
		sendoperation.OperationBatch{},
		&signer.WalletPlugin{},
		"Deleting website chunks",
	)
	if err != nil {
		return nil, fmt.Errorf("deleting website: %w", err)
	}

	return &res.OperationResponse.OperationID, nil
}
