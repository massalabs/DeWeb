package storagekeys

import "github.com/massalabs/station/pkg/convert"

// FileChunkCountKey generates the storage key for the number of chunks of a file.
// [FILE_TAG][hash(location)][CHUNK_NB_TAG] = chunk_count_value
func FileChunkCountKey(hashLocation []byte) []byte {
	return append(append(convert.ToBytes(FILE_TAG), hashLocation...), convert.ToBytes(CHUNK_NB_TAG)...)
}

// FileChunkKey generates the storage key for a specific chunk of a file.
// [FILE_TAG][hash(location)][CHUNK_TAG][index] = chunk_data
func FileChunkKey(hashLocation []byte, index int) []byte {
	return append(append(append(convert.ToBytes(FILE_TAG), hashLocation...), convert.ToBytes(CHUNK_TAG)...), convert.U32ToBytes(index)...)
}
