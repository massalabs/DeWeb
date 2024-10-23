package storagekeys

import "github.com/massalabs/station/pkg/convert"

// globalMetadataKey returns a concatenated byte slice of GLOBAL_METADATA_TAG and metadataKey
func GlobalMetadataKey(metadataKey []byte) []byte {
	return append(convert.ToBytes(GLOBAL_METADATA_TAG), metadataKey...)
}

// fileMetadataKey returns a concatenated byte slice of FILE_METADATA_TAG, hashLocation, and metadataKey
func FileMetadataKey(hashLocation []byte, metadataKey ...[]byte) []byte {
	if len(metadataKey) == 0 {
		return append(convert.ToBytes(FILE_METADATA_TAG), hashLocation...)
	}

	return append(append(convert.ToBytes(FILE_METADATA_TAG), hashLocation...), metadataKey[0]...)
}

// fileMetadataLocationKey returns a concatenated byte slice of FILE_METADATA_LOCATION_TAG and hashLocation
func FileMetadataLocationKey(hashLocation []byte) []byte {
	return FileMetadataKey(append(convert.ToBytes(FILE_METADATA_LOCATION_TAG), hashLocation...))
}
