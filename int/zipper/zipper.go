package zipper

import (
	"archive/zip"
	"bytes"
	"fmt"
	"io"

	"github.com/massalabs/station/pkg/logger"
)

// ReadIndexFromZip returns the content of the index.html file from the given zip content.
func ReadFileFromZip(zipFile []byte, fileName string) ([]byte, error) {

	reader := bytes.NewReader(zipFile)

	zipReader, err := zip.NewReader(reader, int64(reader.Len()))
	if err != nil {
		logger.Errorf("failed to initiate reader: %v", err)
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

	return nil, fmt.Errorf("%s not found in zip", fileName)
}
