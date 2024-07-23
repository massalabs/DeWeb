package chunker

// Max ChunkSize is half a mb (512kb)
const ChunkSize = 512


func DivideChunk(data []byte) [][]byte {
	counter := 0

	chunkNumber := len(data)/ChunkSize + 1

	var chunks [][]byte

	for i := 1; i < chunkNumber; i++ {
		counter += ChunkSize
		chunks = append(chunks, data[(i-1)*ChunkSize:(i)*ChunkSize])
	}

	chunks = append(chunks, data[(chunkNumber-1)*ChunkSize:])
	
	return chunks
}