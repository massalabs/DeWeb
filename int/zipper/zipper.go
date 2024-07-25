package zipper

import (
	"archive/zip"
	"fmt"
	"io"
)

// GetFileFromZip returns the content of the given file from the zip file.
// It returns an error if the file is not found in the zip.
func GetFileFromZip(zipFilePath, fileName string) ([]byte, error) {
	zipReader, err := zip.OpenReader(zipFilePath)
	if err != nil {
		return []byte{}, fmt.Errorf("failed to open zip file: %w", err)
	}
	defer zipReader.Close()

	for _, file := range zipReader.File {
		if file.Name == fileName {
			rc, err := file.Open()
			if err != nil {
				return []byte{}, fmt.Errorf("failed to open file in zip: %w", err)
			}
			defer rc.Close()

			buf, err := io.ReadAll(rc)
			if err != nil {
				return []byte{}, fmt.Errorf("failed to read file in zip: %w", err)
			}

			return buf, nil
		}
	}

	return []byte{}, fmt.Errorf("%s not found in zip", fileName)
}
