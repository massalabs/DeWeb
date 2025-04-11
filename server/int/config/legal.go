package config

import (
	"fmt"
	"os"
	"path/filepath"

	"gopkg.in/yaml.v2"
)

const legalDisclaimerLocalConfigFileName = "disclaimer.yaml"

// GetDisclaimerStoredFilePath retrieves the legal.yaml file from the OS user config folder.
// If the "deweb-provider" directory doesn't exist in the user config folder, creates it.
func GetDisclaimerStoredFilePath() (string, error) {
	configDir, err := configDirPath()
	if err != nil {
		return "", err
	}

	disclaimerConfPath := filepath.Join(configDir, legalDisclaimerLocalConfigFileName)
	if _, err := os.Stat(disclaimerConfPath); err != nil {
		if !os.IsNotExist(err) {
			return "", fmt.Errorf("failed to check %s: %w", disclaimerConfPath, err)
		}
		// create the disclaimer.yaml config file
		err = os.WriteFile(disclaimerConfPath, []byte(""), os.ModePerm)
		if err != nil {
			return "", fmt.Errorf("failed to create %s: %w", disclaimerConfPath, err)
		}
	}

	return disclaimerConfPath, nil
}

/*
GetLegalStoredHash retrieves a map of file names and their corresponding hashes
from the YAML file returned by GetDisclaimerLocalConfig.
*/
func GetLegalStoredHash() (map[string]string, error) {
	disclaimerConfPath, err := GetDisclaimerStoredFilePath()
	if err != nil {
		return nil, err
	}

	data, err := os.ReadFile(disclaimerConfPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read %s: %w", disclaimerConfPath, err)
	}

	hashMap := make(map[string]string)
	if len(data) > 0 {
		err = yaml.Unmarshal(data, &hashMap)
		if err != nil {
			return nil, fmt.Errorf("failed to parse YAML in %s: %w", disclaimerConfPath, err)
		}
	}

	return hashMap, nil
}

/*
SaveLegalStoredHash saves the given map of file names and their corresponding hashes in yaml format
to the YAML file returned by GetDisclaimerLocalConfig function.
This function overwrites the existing content of the file.
*/
func SaveLegalStoredHash(new map[string]string) error {
	disclaimerConfPath, err := GetDisclaimerStoredFilePath()
	if err != nil {
		return err
	}

	data, err := yaml.Marshal(new)
	if err != nil {
		return fmt.Errorf("failed to marshal data to YAML: %w", err)
	}

	err = os.WriteFile(disclaimerConfPath, data, os.ModePerm)
	if err != nil {
		return fmt.Errorf("failed to write to file %s: %w", disclaimerConfPath, err)
	}

	return nil
}
