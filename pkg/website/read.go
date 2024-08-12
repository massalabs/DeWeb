package website

import (
	"fmt"

	"github.com/massalabs/station/int/config"
	"github.com/massalabs/station/pkg/convert"
	"github.com/massalabs/station/pkg/node"
)

// Fetch retrieves the complete data of a website as bytes.
func Fetch(network *config.NetworkInfos, websiteAddress string) ([]byte, error) {
	client := node.NewClient(network.NodeURL)

	chunkNumber, err := GetNumberOfChunks(client, websiteAddress)
	if err != nil {
		return nil, fmt.Errorf("fetching number of chunks: %w", err)
	}

	dataStore, err := fetchAllChunks(client, websiteAddress, chunkNumber)
	if err != nil {
		return nil, fmt.Errorf("fetching all chunks: %w", err)
	}

	return dataStore, nil
}

// GetNumberOfChunks fetches and returns the number of chunks for the website.
func GetNumberOfChunks(client *node.Client, websiteAddress string) (int32, error) {
	nbChunkResponse, err := node.FetchDatastoreEntry(client, websiteAddress, convert.ToBytes(nbChunkKey))
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

// fetchAllChunks retrieves all chunks of data for the website.
func fetchAllChunks(client *node.Client, websiteAddress string, chunkNumber int32) ([]byte, error) {
	keys := make([][]byte, chunkNumber)
	for i := 0; i < int(chunkNumber); i++ {
		keys[i] = convert.I32ToBytes(i)
	}

	response, err := node.ContractDatastoreEntries(client, websiteAddress, keys)
	if err != nil {
		return nil, fmt.Errorf("calling get_datastore_entries '%+v': %w", keys, err)
	}

	if len(response) != int(chunkNumber) {
		return nil, fmt.Errorf("expected %d entries, got %d", chunkNumber, len(response))
	}

	var dataStore []byte
	for _, entry := range response {
		dataStore = append(dataStore, entry.FinalValue...)
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

func GetFirstCreationTimestamp(network *config.NetworkInfos, websiteAddress string) (uint64, error) {
	client := node.NewClient(network.NodeURL)

	firstCreationTimestampResponse, err := node.FetchDatastoreEntry(client, websiteAddress, convert.ToBytes(firstCreationTimestampKey))
	if err != nil {
		return 0, fmt.Errorf("fetching website first creation timestamp: %w", err)
	}

	if firstCreationTimestampResponse.FinalValue == nil {
		return 0, nil
	}

	castedFCTimestamp, err := convert.BytesToU64(firstCreationTimestampResponse.FinalValue)
	if err != nil {
		return 0, fmt.Errorf("converting website first creation timestamp: %w", err)
	}

	return castedFCTimestamp, nil
}

func GetLastUpdateTimestamp(network *config.NetworkInfos, websiteAddress string) (uint64, error) {
	client := node.NewClient(network.NodeURL)

	lastUpdateTimestampResponse, err := node.FetchDatastoreEntry(client, websiteAddress, convert.ToBytes(lastUpdateTimestampKey))
	if err != nil {
		return 0, fmt.Errorf("fetching website last update timestamp: %w", err)
	}

	if lastUpdateTimestampResponse.FinalValue == nil {
		return 0, nil
	}

	castedLUTimestamp, err := convert.BytesToU64(lastUpdateTimestampResponse.FinalValue)
	if err != nil {
		return 0, fmt.Errorf("converting website last update timestamp: %w", err)
	}

	return castedLUTimestamp, nil
}
