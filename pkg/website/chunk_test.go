package chunk

import (
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
		{"Big byte string", []byte("Lorem ipsum dolor sit amet, consectetur adipiscing elit."), 16},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			chunks := DivideIntoChunks(test.data, test.chunkSize)

			if test.data == nil || test.chunkSize <= 0 {
				assert.Nil(t, chunks)

				return
			}

			expectedChunks := (len(test.data) + test.chunkSize - 1) / test.chunkSize

			assert.Equal(t, len(chunks), expectedChunks)

		})
	}
}
