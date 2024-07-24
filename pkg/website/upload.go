package website

import (
	"fmt"

	"github.com/massalabs/DeWeb/pkg/config"
	mwUtils "github.com/massalabs/station-massa-wallet/pkg/utils"
	"github.com/massalabs/station/pkg/convert"
	"github.com/massalabs/station/pkg/logger"
	"github.com/massalabs/station/pkg/node/sendoperation"
	"github.com/massalabs/station/pkg/node/sendoperation/signer"
	"github.com/massalabs/station/pkg/onchain"
)

const (
	appendFunction = "appendBytesToWebsite"
)

func UploadChunk(
	websiteAddress string,
	config *config.Config,
	chunk []byte,
	chunkIndex int,
) (operationID string, err error) {
	if !mwUtils.IsValidAddress(websiteAddress) {
		return "", fmt.Errorf("invalid website address")
	}

	if len(chunk) == 0 {
		return "", fmt.Errorf("chunk is empty, no data to upload")
	}

	params, err := prepareUploadParams(chunk, chunkIndex)
	if err != nil {
		return "", fmt.Errorf("preparing upload params: %w", err)
	}

	uploadCost, err := ComputeChunkCost(chunkIndex, len(chunk))
	if err != nil {
		return "", fmt.Errorf("computing chunk cost: %w", err)
	}

	logger.Debugf("Uploading chunk %d to website at address %s with %d nMAS", chunkIndex, websiteAddress, uploadCost)

	return performUpload(config, websiteAddress, params, uploadCost, chunkIndex)
}

func prepareUploadParams(chunk []byte, chunkIndex int) ([]byte, error) {
	params := convert.I32ToBytes(chunkIndex)
	params = append(params, convert.U32ToBytes(len(chunk))...)
	params = append(params, chunk...)

	return params, nil
}

func performUpload(
	config *config.Config,
	websiteAddress string,
	params []byte,
	uploadCost int,
	chunkIndex int,
) (string, error) {
	res, err := onchain.CallFunction(
		&config.NetworkInfos,
		config.WalletNickname,
		websiteAddress,
		appendFunction,
		params,
		config.MinimalFees,
		config.MaxGas,
		uint64(uploadCost),
		config.Expiry,
		false,
		sendoperation.OperationBatch{},
		&signer.WalletPlugin{},
		fmt.Sprintf("Uploading chunk %d", chunkIndex),
	)
	if err != nil {
		return "", fmt.Errorf("uploading chunk %d failed: %w", chunkIndex, err)
	}

	return res.OperationResponse.OperationID, nil
}
