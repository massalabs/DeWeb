package website

const (
	fileTag        = "\000"
	chunkTag       = "\001"
	chunkNumberTag = "\002"
	matadataTag    = "\003"
	filesPathList  = "\005"
	ownerKey       = "OWNER"

	ChunkSize = 64_000 // 64KB
)
