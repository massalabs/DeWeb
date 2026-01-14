package mns

import (
	"fmt"
	"strings"

	msConfig "github.com/massalabs/deweb-server/pkg/config"
	"github.com/massalabs/station/pkg/convert"
	"github.com/massalabs/station/pkg/logger"
	"github.com/massalabs/station/pkg/node"
	"github.com/massalabs/station/pkg/node/sendoperation"
)

const (
	MainnetAddress  = "AS1q5hUfxLXNXLKsYQVXZLK7MPUZcWaNZZsK7e9QzqhGdAgLpUGT"
	BuildnetAddress = "AS12qKAVjU1nr66JSkQ6N4Lqu4iwuVc6rAbRTrxFoynPrPdP1sj3G"
	mainnetChainID  = 77658377
	buildnetChainID = 77658366

	Extension        = ".massa"
	dnsResolveMethod = "dnsResolve"
	readOnlyCoins    = "0.1"
	readOnlyFee      = "0.1"
)

// ResolveDomain resolves a domain name to its corresponding address.
func ResolveDomain(network *msConfig.NetworkInfos, domain string) (string, error) {
	client := node.NewClient(network.NodeURL)

	scAddress, err := GetSCAddress(network)
	if err != nil {
		return "", fmt.Errorf("could not get mns smart contract address: %w", err)
	}

	params := convert.U32ToBytes(len(domain))
	params = append(params, []byte(domain)...)

	res, err := sendoperation.ReadOnlyCallSC(scAddress, dnsResolveMethod, params, readOnlyCoins, readOnlyFee, scAddress, client)
	if err != nil {
		return "", fmt.Errorf("resolving domain %s: %w", domain, err)
	}

	resolvedDomain, err := deserializeResult(res.Result.Ok)
	if err != nil {
		return "", fmt.Errorf("deserializing result: %w", err)
	}

	logger.Debugf("Resolved domain %s to %s", domain, resolvedDomain)

	return resolvedDomain, nil
}

// deserializeResult deserializes the result from the smart contract call.
func deserializeResult(result []interface{}) (string, error) {
	var target strings.Builder

	for _, val := range result {
		char, ok := val.(float64)
		if !ok {
			return "", fmt.Errorf("unexpected type for value: %v", val)
		}

		target.WriteRune(rune(char))
	}

	return target.String(), nil
}

// GetSCAddress returns the smart contract address based on the network chain ID.
func GetSCAddress(network *msConfig.NetworkInfos) (string, error) {
	switch network.ChainID {
	case mainnetChainID:
		return MainnetAddress, nil
	case buildnetChainID:
		return BuildnetAddress, nil
	default:
		return "", fmt.Errorf("unsupported chain ID: %d", network.ChainID)
	}
}
