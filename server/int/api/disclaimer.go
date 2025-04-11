package api

import (
	"crypto/sha256"
	"embed"
	"encoding/hex"
	"fmt"
	"io/fs"
	"log"

	"github.com/massalabs/deweb-server/int/config"
)

//go:embed resources/legal/*
var legalFiles embed.FS

type LegalFile struct {
	Content []byte
	Hash    string
}

const legalFilesPath = "resources/legal"

// GetLegalFiles returns a map where keys are file names and values are their SHA-256 hashes.
func getLegalFiles() (map[string]LegalFile, error) {
	filesMap := make(map[string]LegalFile)

	err := fs.WalkDir(legalFiles, legalFilesPath, func(path string, file fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		// WalkDir return all files and directories in legalFilesPath directory includind the legalFilesPath's path itself
		if (path == legalFilesPath) || file.IsDir() {
			return nil
		}

		data, readErr := legalFiles.ReadFile(path)
		if readErr != nil {
			return fmt.Errorf("could not read %s: %+w", path, readErr)
		}

		hash := sha256.Sum256(data)
		filesMap[file.Name()] = LegalFile{
			Content: data,
			Hash:    hex.EncodeToString(hash[:]),
		}

		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("could not retrieve legal docs : %+w", err)
	}

	return filesMap, nil
}

/*
HandleDisclaimer check if the user has already accepted legal doc.

If the user has not accepted or if docs have been updated, thses docs are displayed at the screen and the user is
asked to accept.
If the user accepts, the hashes of the legal files are saved in the local config file.
If the user does not accept, the program exits with an explanation message
*/
func HandleDisclaimer() error {
	// Get the legal files from the embedded filesystem
	legalFiles, err := getLegalFiles()
	if err != nil {
		return fmt.Errorf("error retrieving legal files: %+w", err)
	}

	// Get the hashes of the legal files stored locally
	localHashesMap, err := config.GetLegalStoredHash()
	if err != nil {
		return fmt.Errorf("error retrieving local hashes: %+w", err)
	}

	newOrUpdatedLegal := make(map[string]LegalFile)

	/* compare hashes of legals files with their hashes stored localy
	if the file is not present in the local hashes or if the hash is different,
	add it to the newOrUpdatedLegal map.
	*/
	for fileName, legalFile := range legalFiles {
		localHash, exists := localHashesMap[fileName]
		if !exists || localHash != legalFile.Hash {
			newOrUpdatedLegal[fileName] = legalFile
		}
	}

	// If no new or updated legal files, no need to display disclaimer
	if len(newOrUpdatedLegal) == 0 {
		return nil
	}

	// Display the disclaimer and ask for user acceptance
	accepted, err := displayDisclaimer(newOrUpdatedLegal)
	if err != nil {
		return err
	}

	// If the user does not accept the terms, exit the program
	if !accepted {
		log.Fatal("For legal reasons, terms of uses need to be accepted to be allowed to use deweb provider")
	}

	// Save updated local hashes back to the config
	if err := config.SaveLegalStoredHash(convertLegalFileMapToHashMap(legalFiles)); err != nil {
		return fmt.Errorf("error saving updated local hashes: %+w", err)
	}

	return nil
}

// displayDisclaimer displays the content of all LegalFiles in the console and asks the user to validate them.
func displayDisclaimer(legalFiles map[string]LegalFile) (bool, error) {
	fmt.Println("DISCLAIMERS:")
	// Use a Go package to convert markdown to plain text
	for _, legalFile := range legalFiles {
		plainText := string(legalFile.Content)
		fmt.Println(plainText)

		fmt.Println() // Add blank line for better readability
	}

	// Ask the user to accept the terms of use (y/n)
	const maxAttempts = 3
	for attempts := 0; attempts < maxAttempts; attempts++ {
		fmt.Println("Do you accept all legals terms of use ? (y/n):")
		var response string

		_, err := fmt.Scanln(&response)
		if err != nil {
			return false, fmt.Errorf("error reading user acceptation of terms of uses : %+w", err)
		}

		switch response {
		case "y", "Y":
			return true, nil
		case "n", "N":
			return false, nil
		default:
			fmt.Println("Invalid input. Please enter 'y' for yes or 'n' for no.")
		}
	}

	// If the user fails to provide valid input after maxAttempts, assume "no"
	fmt.Println("Maximum attempts reached. Assuming 'no'.")

	return false, nil
}

func convertLegalFileMapToHashMap(legalFiles map[string]LegalFile) map[string]string {
	hashMap := make(map[string]string, len(legalFiles))
	for fileName, legalFile := range legalFiles {
		hashMap[fileName] = legalFile.Hash
	}

	return hashMap
}
