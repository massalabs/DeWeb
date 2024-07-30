package website

import (
	_ "embed"
	"fmt"

	"github.com/massalabs/DeWeb/pkg/config"
	"github.com/massalabs/station/pkg/logger"
	"github.com/massalabs/station/pkg/node/sendoperation"
	"github.com/massalabs/station/pkg/node/sendoperation/signer"
	"github.com/massalabs/station/pkg/onchain"
)

func Delete(conf *config.Config, address string) (*string, error) {
	res, err := onchain.CallFunction(
		&conf.NetworkInfos,
		conf.WalletNickname,
		address,
		"deleteWebsite",
		[]byte{},
		conf.MinimalFees,
		conf.MaxGas,
		config.NoCoins,
		conf.Expiry,
		false,
		sendoperation.OperationBatch{},
		&signer.WalletPlugin{},
		"Deleting website chunks",
	)
	if err != nil {
		return nil, fmt.Errorf("deleting website: %w", err)
	}
	logger.Infof("Event received : %s", res.Event)
	return &res.OperationResponse.OperationID, nil
}
