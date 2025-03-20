package config

import (
	"encoding/json"
	"testing"
)

func TestConvertYamlMisc2Json(t *testing.T) {
	// Define test cases
	testCases := []struct {
		name         string
		input        interface{}
		expectedJSON string
	}{
		{
			name: "Simple YAML",
			input: map[interface{}]interface{}{
				"key1": "value1",
				"key2": 1,
			},
			expectedJSON: `{"key1":"value1","key2":1}`,
		},
		{
			name:         "Empty string JSON",
			input:        ``,
			expectedJSON: `""`,
		},
		{
			name:         "non empty string",
			input:        "test",
			expectedJSON: `"test"`,
		},
		{
			name:         "Empty bracket json",
			input:        map[interface{}]interface{}{},
			expectedJSON: `{}`,
		},
		{
			name:         "nil json",
			input:        nil,
			expectedJSON: `null`,
		},
		{
			name:         "number json",
			input:        1,
			expectedJSON: "1",
		},
		{
			name: "Array json",
			input: []interface{}{
				"item1",
				"item2",
			},
			expectedJSON: `["item1","item2"]`,
		},
		{
			name: "complex json",
			input: map[interface{}]interface{}{
				"key1": "value1",
				"key2": map[interface{}]interface{}{
					"key3": "value3",
					"key4": []interface{}{
						"item1",
						"item2",
						map[interface{}]interface{}{
							"key10": "value10",
						},
					},
				},
				"key5": map[interface{}]interface{}{
					"key6": 1,
					"key7": map[interface{}]interface{}{
						"key8": "value8",
						"key9": "value9",
					},
				},
			},
			expectedJSON: `{"key1":"value1","key2":{"key3":"value3","key4":["item1","item2",{"key10":"value10"}]},"key5":{"key6":1,"key7":{"key8":"value8","key9":"value9"}}}`,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			res := convertYamlMisc2Json(tc.input)

			jsonOutput, err := json.Marshal(res)
			if err != nil {
				t.Errorf("FAIL test %s: Failed to marshal the JSON: %v", tc.name, err)
			}

			// Compare the output with the expected result
			if string(jsonOutput) != tc.expectedJSON {
				t.Errorf("FAIL test %s: Expected JSON: %s, but got: %s", tc.name, tc.expectedJSON, jsonOutput)
			}
		})
	}
}
