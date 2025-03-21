package storagekeys

import "github.com/massalabs/station/pkg/convert"

// globalMetadataKey returns a concatenated byte slice of GLOBAL_METADATA_TAG and metadataKey
func GlobalMetadataKey(metadataKey string) []byte {
	return append(convert.ToBytes(GLOBAL_METADATA_TAG), convert.ToBytes(metadataKey)...)
}

// fileMetadataKey returns a concatenated byte slice of FILE_METADATA_TAG, hashLocation, and metadataKey
func FileMetadataKey(hashLocation [32]byte, metadataKey string) []byte {
	return append(append(convert.ToBytes(FILE_METADATA_TAG), hashLocation[:]...), convert.ToBytes(metadataKey)...)
}
