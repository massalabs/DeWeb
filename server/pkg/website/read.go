package website

import (
	"bytes"
	"crypto/sha256"
	"fmt"
	"strconv"
	"time"

	"github.com/massalabs/deweb-server/pkg/website/storagekeys"
	"github.com/massalabs/station/int/config"
	"github.com/massalabs/station/pkg/convert"
	"github.com/massalabs/station/pkg/logger"
	"github.com/massalabs/station/pkg/node"
)

const (
	datastoreBatchSize     = 64
	notFoundErrorTemplate  = "no chunks found for file %s"
	lastUpdateTimestampKey = "LAST_UPDATE"
)

// Fetch retrieves the complete data of a website as bytes.
func Fetch(network *config.NetworkInfos, websiteAddress string, filePath string) ([]byte, error) {
	client := node.NewClient(network.NodeURL)

	isPresent, err := FilePathExists(network, websiteAddress, filePath)
	if err != nil {
		return nil, fmt.Errorf("checking if file is present on chain: %w", err)
	}

	if isPresent {
		logger.Debugf("File '%s' is present on chain", filePath)
	} else {
		return nil, fmt.Errorf("file '%s' not found on chain", filePath)
	}

	chunkNumber, err := GetNumberOfChunks(client, websiteAddress, filePath)
	if err != nil {
		return nil, fmt.Errorf("fetching number of chunks: %w", err)
	}

	logger.Debugf("Number of chunks for file '%s': %d", filePath, chunkNumber)

	if chunkNumber == 0 {
		return nil, fmt.Errorf("no chunks found for file '%s'", filePath)
	}

	dataStore, err := fetchAllChunks(client, websiteAddress, filePath, chunkNumber)
	if err != nil {
		return nil, fmt.Errorf("fetching all chunks: %w", err)
	}

	return dataStore, nil
}

// GetNumberOfChunks fetches and returns the number of chunks for the website.
func GetNumberOfChunks(client *node.Client, websiteAddress string, filePath string) (int32, error) {
	filePathHash := sha256.Sum256([]byte(filePath))
	nbChunkKey := storagekeys.FileChunkCountKey(filePathHash[:])

	nbChunkResponse, err := node.FetchDatastoreEntry(client, websiteAddress, nbChunkKey)
	if err != nil {
		return 0, fmt.Errorf("fetching website number of chunks: %w", err)
	}

	if nbChunkResponse.FinalValue == nil {
		// TODO: Check if there is a better way to handle this case, for example with CandidateValue
		return 0, fmt.Errorf(notFoundErrorTemplate, filePath)
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
	filteredKeys, err := getFileLocationKeys(client, websiteAddress)
	if err != nil {
		return nil, fmt.Errorf("fetching website file location keys: %w", err)
	}

	filesPathListResponse, err := node.ContractDatastoreEntries(client, websiteAddress, filteredKeys)
	if err != nil {
		return nil, fmt.Errorf("fetching website files path list: %w", err)
	}

	filesPathList := make([]string, len(filesPathListResponse))

	for i, entry := range filesPathListResponse {
		filesPathList[i] = string(entry.FinalValue)
	}

	return filesPathList, nil
}

// getFileLocationKeys fetches and returns the keys for the file locations.
func getFileLocationKeys(client *node.Client, websiteAddress string) ([][]byte, error) {
	addressesInfo, err := node.Addresses(client, []string{websiteAddress})
	if err != nil {
		return nil, fmt.Errorf("converting website address: %w", err)
	}

	addressInfo := addressesInfo[0]
	keys := addressInfo.FinalDatastoreKeys

	var filteredKeys [][]byte

	for _, key := range keys {
		if len(key) > len(storagekeys.FileLocationTag()) && bytes.Equal(key[:len(storagekeys.FileLocationTag())], storagekeys.FileLocationTag()) {
			filteredKeys = append(filteredKeys, key)
		}
	}

	return filteredKeys, nil
}

// fetchAllChunks retrieves all chunks of data for the website.
func fetchAllChunks(client *node.Client, websiteAddress string, filePath string, chunkNumber int32) ([]byte, error) {
	filePathHash := sha256.Sum256([]byte(filePath))

	keys := make([][]byte, chunkNumber)
	for i := 0; i < int(chunkNumber); i++ {
		keys[i] = storagekeys.FileChunkKey(filePathHash[:], i)
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
			if len(entry.FinalValue) == 0 {
				return nil, fmt.Errorf("empty chunk")
			}

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

// GetLastUpdateTimestamp retrieves the last update timestamp of the website.
func GetLastUpdateTimestamp(network *config.NetworkInfos, websiteAddress string) (*time.Time, error) {
	client := node.NewClient(network.NodeURL)

	lastUpdateTimestampResponse, err := node.FetchDatastoreEntry(client, websiteAddress, storagekeys.GlobalMetadataKey(convert.ToBytes(lastUpdateTimestampKey)))
	if err != nil {
		return nil, fmt.Errorf("fetching website last update timestamp: %w", err)
	}

	if lastUpdateTimestampResponse.FinalValue == nil {
		return nil, nil
	}

	timestampStr := string(lastUpdateTimestampResponse.FinalValue)

	castedLUTimestamp, err := strconv.ParseUint(timestampStr, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("converting website last update timestamp: %w", err)
	}

	timestamp := time.Unix(int64(castedLUTimestamp), 0)

	return &timestamp, nil
}

// Check if the requested filePath exists in the SC FilesPathList
func FilePathExists(network *config.NetworkInfos, websiteAddress string, filePath string) (bool, error) {
	client := node.NewClient(network.NodeURL)
	if client == nil {
		return false, fmt.Errorf("failed to create node client")
	}

	files, err := GetFilesPathList(client, websiteAddress)
	if err != nil {
		return false, fmt.Errorf("failed to get files path list: %w", err)
	}

	for _, file := range files {
		if file == filePath {
			return true, nil
		}
	}

	return false, nil
}
