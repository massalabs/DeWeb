package website

import (
	"fmt"

	"github.com/massalabs/station/pkg/convert"
	"github.com/massalabs/station/pkg/node/sendoperation"
)

func DivideIntoChunks(data []byte, chunkSize int) [][]byte {
	if data == nil || chunkSize <= 0 {
		return nil
	}

	var chunks [][]byte

	for i := 0; i < len(data); i += chunkSize {
		end := i + chunkSize
		if end > len(data) {
			end = len(data)
		}

		chunks = append(chunks, data[i:end])
	}

	return chunks
}

// ComputeChunkCost computes the cost of uploading a chunk to a website.
// The cost is computed based on the size of the chunk and the index of the chunk.
// The cost of the first chunk includes the cost of nbChunk key creation.
//
// TODO: This function should be updated to avoid sending coins for chunks that do not require it.
//   - chunk X in storage has chunkSize bytes, so we should not send coins for it.
//   - chunk X in storage has 30% of chunkSize bytes, so we should only the missing 70% of chunkSize bytes in coins.
func ComputeChunkCost(chunkIndex int, chunkSize int) (int, error) {
	uploadCost, err := sendoperation.StorageCostForEntry(convert.BytesPerUint32, chunkSize)
	if err != nil {
		return 0, fmt.Errorf("unable to compute storage cost for chunk upload: %w", err)
	}

	if chunkIndex == 0 {
		chunkKeyCost, err := sendoperation.StorageCostForEntry(len([]byte(nbChunkKey)), convert.BytesPerUint32)
		if err != nil {
			return 0, fmt.Errorf("unable to compute storage cost for nbChunk key creation: %w", err)
		}

		uploadCost += chunkKeyCost
	}

	return uploadCost, nil
}
