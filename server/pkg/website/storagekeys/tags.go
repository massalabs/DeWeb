package storagekeys

import "github.com/massalabs/station/pkg/convert"

const (
	FILE_TAG                   = "\x01FILE"
	FILE_LOCATION_TAG          = "\x02LOCATION"
	CHUNK_TAG                  = "\x03CHUNK"
	CHUNK_NB_TAG               = "\x04CHUNK_NB"
	FILE_METADATA_TAG          = "\x05FM"
	GLOBAL_METADATA_TAG        = "\x06GM"
	FILE_METADATA_LOCATION_TAG = "\x07FML"
	DEWEB_VERSION_TAG          = "\xFFDEWEB_VERSION"
)

// FileLocationTag is the tag for the file location as a byte array.
func FileLocationTag() []byte {
	return convert.ToBytes(FILE_LOCATION_TAG)
}

func FileTag() []byte {
	return convert.ToBytes(FILE_TAG)
}

func MetadataFileTag() []byte {
	return convert.ToBytes(FILE_METADATA_TAG)
}

func GlobalMetadataTag() []byte {
	return convert.ToBytes(GLOBAL_METADATA_TAG)
}
