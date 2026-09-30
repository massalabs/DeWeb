package website

import (
	"context"
	"fmt"

	"github.com/massalabs/station/pkg/node"
)

// datastoreKeysPageSize is the number of keys requested per get_addresses_datastore_keys call.
// It matches the node default max_datastore_keys_query: a node rejects a request asking for more
// keys than its configured maximum.
const datastoreKeysPageSize = 500

type datastoreKeysRequest struct {
	Address           string             `json:"address"`
	Prefix            node.JSONableSlice `json:"prefix"`
	IsFinal           bool               `json:"is_final"`
	StartKey          node.JSONableSlice `json:"start_key,omitempty"`
	InclusiveStartKey bool               `json:"inclusive_start_key"`
	Count             uint32             `json:"count"`
}

type datastoreKeysResponse struct {
	Keys [][]byte `json:"keys"`
}

// finalDatastoreKeys returns every final datastore key of address starting with prefix, in ascending
// byte order.
//
// The keys are fetched one page at a time with get_addresses_datastore_keys. get_addresses is not
// used: it returns at most max_datastore_keys_query keys (500 by default) for the whole address,
// with no way to page or to filter by prefix.
func finalDatastoreKeys(client *node.Client, address string, prefix []byte) ([][]byte, error) {
	var keys [][]byte

	request := datastoreKeysRequest{
		Address: address,
		// A nil JSONableSlice marshals to null, which the node rejects for prefix.
		Prefix:  append(node.JSONableSlice{}, prefix...),
		IsFinal: true,
		Count:   datastoreKeysPageSize,
	}

	for {
		page, err := fetchDatastoreKeysPage(client, request)
		if err != nil {
			return nil, err
		}

		keys = append(keys, page...)

		// A short page means the range is exhausted.
		if len(page) < datastoreKeysPageSize {
			return keys, nil
		}

		// Exclusive cursor: the next page starts after the last key read.
		request.StartKey = page[len(page)-1]
	}
}

func fetchDatastoreKeysPage(client *node.Client, request datastoreKeysRequest) ([][]byte, error) {
	response, err := client.RPCClient.Call(
		context.Background(),
		"get_addresses_datastore_keys",
		[1][]datastoreKeysRequest{{request}},
	)
	if err != nil {
		return nil, fmt.Errorf("calling get_addresses_datastore_keys for '%s': %w", request.Address, err)
	}

	if response.Error != nil {
		return nil, response.Error
	}

	var content []datastoreKeysResponse

	err = response.GetObject(&content)
	if err != nil {
		return nil, fmt.Errorf("parsing get_addresses_datastore_keys jsonrpc response '%+v': %w", response, err)
	}

	if len(content) != 1 {
		return nil, fmt.Errorf("get_addresses_datastore_keys returned %d results for 1 request", len(content))
	}

	return content[0].Keys, nil
}
