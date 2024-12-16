package zipper

import (
	"archive/zip"
	"bytes"
	"fmt"
	"io"
)

const notFoundErrorTemplate = "%s not found in zip"

// ReadIndexFromZip returns the content of the desired file from the given zip file.
func ReadFileFromZip(zipFile []byte, fileName string) ([]byte, error) {
	reader := bytes.NewReader(zipFile)

	zipReader, err := zip.NewReader(reader, int64(reader.Len()))
	if err != nil {
		return nil, fmt.Errorf("failed to initiate reader: %v", err)
	}

	for _, file := range zipReader.File {
		if file.Name == fileName {
			rc, err := file.Open()
			if err != nil {
				return nil, fmt.Errorf("failed to open file in zip: %w", err)
			}
			defer rc.Close()

			buf, err := io.ReadAll(rc)
			if err != nil {
				return nil, fmt.Errorf("failed to read file in zip: %w", err)
			}

			return buf, nil
		}
	}

	return nil, fmt.Errorf(notFoundErrorTemplate, fileName)
}

func IsNotFoundError(err error, fileName string) bool {
	return fmt.Sprintf(notFoundErrorTemplate, fileName) == err.Error()
}

func IsValidZip(zipFile []byte) bool {
	reader := bytes.NewReader(zipFile)
	_, err := zip.NewReader(reader, int64(reader.Len()))

	return err == nil
}

func VerifyFilePresence(zipFile []byte, fileName string) (bool, error) {
	reader := bytes.NewReader(zipFile)

	zipReader, err := zip.NewReader(reader, int64(reader.Len()))
	if err != nil {
		return false, fmt.Errorf("failed to initiate zip reader: %v", err)
	}

	for _, file := range zipReader.File {
		if file.Name == fileName {
			return true, nil
		}
	}

	return false, fmt.Errorf("%s not found in zip file", fileName)
}
