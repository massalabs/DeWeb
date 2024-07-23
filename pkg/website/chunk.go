package chunk

import "fmt"

func DivideChunk(data []byte, chunkSize int) ([][]byte, error) {
	chunkNumber := len(data)/chunkSize + 1

	if len(data) < 1 {
		return nil, fmt.Errorf("data is empty")
	}

	var chunks [][]byte

	for i := 1; i < chunkNumber; i++ {
		chunks = append(chunks, data[(i-1)*chunkSize:(i)*chunkSize])
	}

	chunks = append(chunks, data[(chunkNumber-1)*chunkSize:])

	return chunks, nil
}
