package mns

import (
	"testing"

	msConfig "github.com/massalabs/station/int/config"
)

func TestGetSCAddress(t *testing.T) {
	testCases := []struct {
		name          string
		chainID       uint64
		expectedAddr  string
		expectedError bool
	}{
		{
			name:          "Mainnet Chain ID",
			chainID:       mainnetChainID,
			expectedAddr:  MainnetAddress,
			expectedError: false,
		},
		{
			name:          "Buildnet Chain ID",
			chainID:       buildnetChainID,
			expectedAddr:  BuildnetAddress,
			expectedError: false,
		},
		{
			name:          "Unsupported Chain ID",
			chainID:       12345678,
			expectedAddr:  "",
			expectedError: true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			network := &msConfig.NetworkInfos{
				ChainID: tc.chainID,
			}

			addr, err := GetSCAddress(network)

			if tc.expectedError {
				if err == nil {
					t.Errorf("Expected an error but got none")
				}
			} else {
				if err != nil {
					t.Errorf("Did not expect an error but got: %v", err)
				}
				if addr != tc.expectedAddr {
					t.Errorf("Expected address %s, but got %s", tc.expectedAddr, addr)
				}
			}
		})
	}
}
func TestDeserializeResult(t *testing.T) {
	testCases := []struct {
		name          string
		input         []interface{}
		expected      string
		expectedError bool
	}{
		{
			name:          "Valid input",
			input:         []interface{}{65.0, 66.0, 67.0}, // ASCII for "ABC"
			expected:      "ABC",
			expectedError: false,
		},
		{
			name:          "Empty input",
			input:         []interface{}{},
			expected:      "",
			expectedError: false,
		},
		{
			name:          "Invalid type in input",
			input:         []interface{}{65.0, "B", 67.0}, // "B" is not a float64
			expected:      "",
			expectedError: true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result, err := deserializeResult(tc.input)

			if tc.expectedError {
				if err == nil {
					t.Errorf("Expected an error but got none")
				}
			} else {
				if err != nil {
					t.Errorf("Did not expect an error but got: %v", err)
				}
				if result != tc.expected {
					t.Errorf("Expected result %s, but got %s", tc.expected, result)
				}
			}
		})
	}
}
