package website

import (
	_ "embed"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestChunk(t *testing.T) {
	tests := []struct {
		name      string
		data      []byte
		chunkSize int
	}{
		{"Empty byte array", []byte(nil), 2},
		{"Nil chunkSize", []byte("Hello"), 0},
		{"Nominal test case", []byte("Hello, World!"), 1},
		{"Median", []byte("Hello, World!"), 4},
		{"Big byte array", []byte("Lorem ipsum dolor sit amet, consectetur adipiscing elit."), 16},
		{"Small byte array", []byte("hello"), 32},
		{"Single character", []byte("a"), 2},
		{"Exact divisible length", []byte("123456"), 2},
		{"Long sentence", []byte("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."), 3},
		{"Website deployer wasm", sc, ChunkSize},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			chunks := DivideIntoChunks(test.data, test.chunkSize)

			if test.data == nil || test.chunkSize <= 0 {
				assert.Nil(t, chunks)
				return
			}

			expectedLen := (len(test.data) + test.chunkSize - 1) / test.chunkSize
			assert.Equal(t, len(chunks), expectedLen)

			expectedLastChunkLen := len(test.data) % test.chunkSize
			if expectedLastChunkLen == 0 && len(test.data) > 0 {
				expectedLastChunkLen = test.chunkSize
			}

			// Assert the length of each chunk except the last one
			for i := 0; i < len(chunks)-1; i++ {
				assert.Equal(t, test.chunkSize, len(chunks[i]), "Chunk size does not match the expected value.")
			}

			// Assert the length of the last chunk
			if len(chunks) > 0 {
				lastChunk := chunks[len(chunks)-1]
				assert.Equal(t, expectedLastChunkLen, len(lastChunk), "The length of the last chunk does not match the expected value.")
			}
		})
	}
}
