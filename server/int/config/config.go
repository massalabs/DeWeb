package config

import (
	"fmt"
	"os"
	"path/filepath"
)

const dewebProviderDirName = "deweb-provider"

// configDirPath returns the path where the deweb provider config files are stored.
func configDirPath() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", fmt.Errorf("getting user config directory: %w", err)
	}

	path := filepath.Join(configDir, dewebProviderDirName)

	// create the directory if it doesn't exist
	if _, err := os.Stat(path); err != nil {
		if !os.IsNotExist(err) {
			return "", fmt.Errorf("checking deweb provider directory: %w", err)
		}
		// create the directory
		err = os.Mkdir(path, os.ModePerm)
		if err != nil {
			return "", fmt.Errorf("creating account directory '%s': %w", path, err)
		}
	}

	return path, nil
}
