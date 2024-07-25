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

	chunkNumber, err := getNumberOfChunks(client, websiteAddress)
	if err != nil {
		return nil, fmt.Errorf("fetching number of chunks: %w", err)
	}

	dataStore, err := fetchAllChunks(client, websiteAddress, chunkNumber)
	if err != nil {
		return nil, fmt.Errorf("fetching all chunks: %w", err)
	}

	return dataStore, nil
}

// getNumberOfChunks fetches and returns the number of chunks for the website.
func getNumberOfChunks(client *node.Client, websiteAddress string) (int32, error) {
	nbChunkResponse, err := node.FetchDatastoreEntry(client, websiteAddress, convert.ToBytes(nbChunkKey))
	if err != nil {
		return 0, fmt.Errorf("fetching website number of chunks: %w", err)
	}

	chunkNumber, err := convert.BytesToI32(nbChunkResponse.CandidateValue)
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
		dataStore = append(dataStore, entry.CandidateValue...)
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

	return string(ownerResponse.CandidateValue), nil
}
