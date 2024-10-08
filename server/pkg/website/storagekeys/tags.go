package storagekeys

const (
	FILE_TAG                   = byte(0)
	FILE_LOCATION_TAG          = byte(1)
	CHUNK_TAG                  = byte(2)
	CHUNK_NB_TAG               = byte(3)
	FILE_METADATA_TAG          = byte(4)
	GLOBAL_METADATA_TAG        = byte(5)
	FILE_METADATA_LOCATION_TAG = byte(6)
)

func DewebVersionKey() []byte {
	return []byte("\x42MASSA_DEWEB_VERSION")
}
