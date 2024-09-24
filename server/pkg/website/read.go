package website

import (
	"crypto/sha256"
	"fmt"

	"github.com/massalabs/station/int/config"
	"github.com/massalabs/station/pkg/convert"
	"github.com/massalabs/station/pkg/node"
)

const (
	datastoreBatchSize    = 64
	notFoundErrorTemplate = "no chunks found for file %s"
)

// Fetch retrieves the complete data of a website as bytes.
func Fetch(network *config.NetworkInfos, websiteAddress string, filePath string) ([]byte, error) {
	client := node.NewClient(network.NodeURL)

	chunkNumber, err := GetNumberOfChunks(client, websiteAddress, filePath)
	if err != nil {
		return nil, fmt.Errorf("fetching number of chunks: %w", err)
	}

	if chunkNumber == 0 {
		return nil, fmt.Errorf(notFoundErrorTemplate, filePath)
	}

	dataStore, err := fetchAllChunks(client, websiteAddress, filePath, chunkNumber)
	if err != nil {
		return nil, fmt.Errorf("fetching all chunks: %w", err)
	}

	return dataStore, nil
}

// IsNotFoundError checks if the error is a not found error.
func IsNotFoundError(err error, fileName string) bool {
	return fmt.Sprintf(notFoundErrorTemplate, fileName) == err.Error()
}

// GetNumberOfChunks fetches and returns the number of chunks for the website.
func GetNumberOfChunks(client *node.Client, websiteAddress string, filePath string) (int32, error) {
	nbChunkKey := getTotalChunkKey(sha256.Sum256([]byte(filePath)))

	nbChunkResponse, err := node.FetchDatastoreEntry(client, websiteAddress, nbChunkKey)
	if err != nil {
		return 0, fmt.Errorf("fetching website number of chunks: %w", err)
	}

	if nbChunkResponse.FinalValue == nil {
		return 0, nil
	}

	chunkNumber, err := convert.BytesToI32(nbChunkResponse.FinalValue)
	if err != nil {
		return 0, fmt.Errorf("converting fetched data for key '%s': %w", nbChunkKey, err)
	}

	return chunkNumber, nil
}

// GetFilesPathList fetches and returns the list of files for the website.
func GetFilesPathList(
	client *node.Client,
	websiteAddress string,
) ([]string, error) {
	filesPathListResponse, err := node.FetchDatastoreEntry(client, websiteAddress, []byte(filesPathList))
	if err != nil {
		return nil, fmt.Errorf("fetching website files path list: %w", err)
	}

	if filesPathListResponse.FinalValue == nil {
		return nil, nil
	}

	filesPathList := convert.ToStringArray(filesPathListResponse.FinalValue)

	return filesPathList, nil
}

// fetchAllChunks retrieves all chunks of data for the website.
func fetchAllChunks(client *node.Client, websiteAddress string, filePath string, chunkNumber int32) ([]byte, error) {
	filePathHash := sha256.Sum256([]byte(filePath))

	keys := make([][]byte, chunkNumber)
	for i := 0; i < int(chunkNumber); i++ {
		keys[i] = getChunkKey(filePathHash, i)
	}

	var dataStore []byte

	for start := 0; start < int(chunkNumber); start += datastoreBatchSize {
		end := start + datastoreBatchSize
		if end > int(chunkNumber) {
			end = int(chunkNumber)
		}

		batchKeys := keys[start:end]

		response, err := node.ContractDatastoreEntries(client, websiteAddress, batchKeys)
		if err != nil {
			return nil, fmt.Errorf("calling get_datastore_entries '%+v': %w", batchKeys, err)
		}

		if len(response) != len(batchKeys) {
			return nil, fmt.Errorf("expected %d entries, got %d", len(batchKeys), len(response))
		}

		for _, entry := range response {
			dataStore = append(dataStore, entry.FinalValue...)
		}
	}

	return dataStore, nil
}

// GetOwner retrieves the owner of the website.
func GetOwner(network *config.NetworkInfos, websiteAddress string) (string, error) {
	client := node.NewClient(network.NodeURL)

	ownerResponse, err := node.FetchDatastoreEntry(client, websiteAddress, convert.ToBytes(ownerKey))
	if err != nil {
		return "", fmt.Errorf("fetching website owner: %w", err)
	}

	return string(ownerResponse.FinalValue), nil
}

// TODO: Update those functions once implemented in the new SC

// func GetFirstCreationTimestamp(network *config.NetworkInfos, websiteAddress string) (uint64, error) {
// 	client := node.NewClient(network.NodeURL)

// 	firstCreationTimestampResponse, err := node.FetchDatastoreEntry(client, websiteAddress, convert.ToBytes(firstCreationTimestampKey))
// 	if err != nil {
// 		return 0, fmt.Errorf("fetching website first creation timestamp: %w", err)
// 	}

// 	if firstCreationTimestampResponse.FinalValue == nil {
// 		return 0, nil
// 	}

// 	castedFCTimestamp, err := convert.BytesToU64(firstCreationTimestampResponse.FinalValue)
// 	if err != nil {
// 		return 0, fmt.Errorf("converting website first creation timestamp: %w", err)
// 	}

// 	return castedFCTimestamp, nil
// }

// func GetLastUpdateTimestamp(network *config.NetworkInfos, websiteAddress string) (uint64, error) {
// 	client := node.NewClient(network.NodeURL)

// 	lastUpdateTimestampResponse, err := node.FetchDatastoreEntry(client, websiteAddress, convert.ToBytes(lastUpdateTimestampKey))
// 	if err != nil {
// 		return 0, fmt.Errorf("fetching website last update timestamp: %w", err)
// 	}

// 	if lastUpdateTimestampResponse.FinalValue == nil {
// 		return 0, nil
// 	}

// 	castedLUTimestamp, err := convert.BytesToU64(lastUpdateTimestampResponse.FinalValue)
// 	if err != nil {
// 		return 0, fmt.Errorf("converting website last update timestamp: %w", err)
// 	}

// 	return castedLUTimestamp, nil
// }
