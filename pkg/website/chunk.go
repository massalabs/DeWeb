package chunk

func DivideIntoChunks(data []byte, chunkSize int) [][]byte {
	if data == nil || chunkSize <= 0 {
		return nil
	}

	var chunks [][]byte

	for i := 0; i < len(data); i += chunkSize {
		end := i + chunkSize
		if end > len(data) {
			end = len(data)
		}

		chunks = append(chunks, data[i:end])
	}

	return chunks
}
