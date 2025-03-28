package website

import (
	"bytes"
	"crypto/sha256"
	"fmt"
	"strconv"
	"sync"
	"time"

	"github.com/massalabs/deweb-server/int/api/config"
	"github.com/massalabs/deweb-server/pkg/website/storagekeys"
	msConfig "github.com/massalabs/station/int/config"
	"github.com/massalabs/station/pkg/convert"
	"github.com/massalabs/station/pkg/logger"
	"github.com/massalabs/station/pkg/node"
)

const (
	datastoreBatchSize     = 64
	notFoundErrorTemplate  = "no chunks found for file %s"
	lastUpdateTimestampKey = "LAST_UPDATE"
	httpHeaderPrefix       = "http-header:"
)

// filePathListCacheEntry represents a cached file path list with its expiration time
type filePathListCacheEntry struct {
	files      map[string]struct{} // Using map for O(1) lookups
	expiration time.Time
}

// filePathListCache is a thread-safe cache for file path lists
type filePathListCache struct {
	mu    sync.RWMutex
	cache map[string]*filePathListCacheEntry
}

var (
	globalFilePathListCache = &filePathListCache{
		cache: make(map[string]*filePathListCacheEntry),
	}
	serverConfig *config.ServerConfig
)

// SetConfig sets the server configuration for the website package
func SetConfig(config *config.ServerConfig) {
	serverConfig = config
}

// get retrieves the file path list from cache if it exists and is not expired
func (c *filePathListCache) get(websiteAddress string) (map[string]struct{}, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	entry, exists := c.cache[websiteAddress]
	if !exists {
		return nil, false
	}

	if time.Now().After(entry.expiration) {
		return nil, false
	}

	return entry.files, true
}

// set stores the file path list in the cache with an expiration time based on config
func (c *filePathListCache) set(websiteAddress string, files []string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	// Clean up expired entries before adding new ones
	now := time.Now()
	for key, entry := range c.cache {
		if now.After(entry.expiration) {
			delete(c.cache, key)
		}
	}

	// Convert slice to map for O(1) lookups
	filesMap := make(map[string]struct{}, len(files))
	for _, file := range files {
		filesMap[file] = struct{}{}
	}

	// Get expiration duration from config or use default
	var cacheDuration time.Duration
	if serverConfig != nil {
		cacheDuration = time.Duration(serverConfig.FileListCacheDurationSeconds) * time.Second
	} else {
		cacheDuration = time.Duration(config.DefaultFileListCacheDurationSeconds) * time.Second
	}

	c.cache[websiteAddress] = &filePathListCacheEntry{
		files:      filesMap,
		expiration: now.Add(cacheDuration),
	}
}

// Fetch retrieves the complete data of a website as bytes.
func Fetch(network *msConfig.NetworkInfos, websiteAddress string, filePath string) ([]byte, error) {
	client := node.NewClient(network.NodeURL)

	isPresent, err := FilePathExists(network, websiteAddress, filePath)
	if err != nil {
		return nil, fmt.Errorf("checking if file is present on chain: %w", err)
	}

	if isPresent {
		logger.Debugf("File '%s' is present on chain", filePath)
	} else {
		return nil, fmt.Errorf("file '%s' not found on chain", filePath)
	}

	chunkNumber, err := GetNumberOfChunks(client, websiteAddress, filePath)
	if err != nil {
		return nil, fmt.Errorf("fetching number of chunks: %w", err)
	}

	logger.Debugf("Number of chunks for file '%s': %d", filePath, chunkNumber)

	if chunkNumber == 0 {
		return nil, fmt.Errorf("no chunks found for file '%s'", filePath)
	}

	dataStore, err := fetchAllChunks(client, websiteAddress, filePath, chunkNumber)
	if err != nil {
		return nil, fmt.Errorf("fetching all chunks: %w", err)
	}

	return dataStore, nil
}

// Fetch retrieves the complete data of a website as bytes.
func GetHttpHeaders(network *msConfig.NetworkInfos, websiteAddress string, filePath string) (map[string]string, error) {
	client := node.NewClient(network.NodeURL)

	globalMetadataKeyFilter := storagekeys.GlobalMetadataKey(httpHeaderPrefix)

	fileHash := sha256.Sum256([]byte(filePath))

	fileMetadataKeyFilter := storagekeys.FileMetadataKey(fileHash, httpHeaderPrefix)

	addressInfo, err := node.Addresses(client, []string{websiteAddress})
	if err != nil {
		return nil, fmt.Errorf("calling get_addresses '%+v': %w", []string{websiteAddress}, err)
	}

	datastoreKeys := addressInfo[0].FinalDatastoreKeys

	headersRecord := make(map[string]string)

	var httpHeaderKeys [][]byte

	for _, key := range datastoreKeys {
		var parsedKey string
		if bytes.HasPrefix(key, globalMetadataKeyFilter) {
			parsedKey = string(key[len(globalMetadataKeyFilter):])

			// to avoid duplicate http headers append global one only if not present
			if _, exists := headersRecord[parsedKey]; !exists {
				headersRecord[parsedKey] = ""

				httpHeaderKeys = append(httpHeaderKeys, key)
			}
		}

		// file headers should override global ones
		if bytes.HasPrefix(key, fileMetadataKeyFilter) {
			httpHeaderKeys = append(httpHeaderKeys, key)
			parsedKey = string(key[len(fileMetadataKeyFilter):])
			headersRecord[parsedKey] = ""
		}
	}

	httpHeaderValues, err := node.ContractDatastoreEntries(client, websiteAddress, httpHeaderKeys)
	if err != nil {
		return nil, fmt.Errorf("fetching http header metadata values: %w", err)
	}

	for idx, val := range httpHeaderValues {
		var parsedKey string
		if bytes.HasPrefix(httpHeaderKeys[idx], fileMetadataKeyFilter) {
			parsedKey = string(httpHeaderKeys[idx][len(fileMetadataKeyFilter):])
		}

		if bytes.HasPrefix(httpHeaderKeys[idx], globalMetadataKeyFilter) {
			parsedKey = string(httpHeaderKeys[idx][len(globalMetadataKeyFilter):])
		}

		headersRecord[parsedKey] = string(val.FinalValue)
	}

	return headersRecord, nil
}

// GetNumberOfChunks fetches and returns the number of chunks for the website.
func GetNumberOfChunks(client *node.Client, websiteAddress string, filePath string) (int32, error) {
	filePathHash := sha256.Sum256([]byte(filePath))
	nbChunkKey := storagekeys.FileChunkCountKey(filePathHash[:])

	nbChunkResponse, err := node.FetchDatastoreEntry(client, websiteAddress, nbChunkKey)
	if err != nil {
		return 0, fmt.Errorf("fetching website number of chunks: %w", err)
	}

	if nbChunkResponse.FinalValue == nil {
		// TODO: Check if there is a better way to handle this case, for example with CandidateValue
		return 0, fmt.Errorf(notFoundErrorTemplate, filePath)
	}

	chunkNumber, err := convert.BytesToI32(nbChunkResponse.FinalValue)
	if err != nil {
		return 0, fmt.Errorf("converting fetched data for key '%s': %w", nbChunkKey, err)
	}

	return chunkNumber, nil
}

// GetFilesPathList fetches and returns the list of files for the website.
func GetFilesPathList(
	client *node.Client,
	websiteAddress string,
) ([]string, error) {
	// Try to get from cache first
	if files, exists := globalFilePathListCache.get(websiteAddress); exists {
		// Convert map back to slice
		result := make([]string, 0, len(files))
		for file := range files {
			result = append(result, file)
		}

		return result, nil
	}

	filteredKeys, err := getFileLocationKeys(client, websiteAddress)
	if err != nil {
		return nil, fmt.Errorf("fetching website file location keys: %w", err)
	}

	filesPathListResponse, err := node.ContractDatastoreEntries(client, websiteAddress, filteredKeys)
	if err != nil {
		return nil, fmt.Errorf("fetching website files path list: %w", err)
	}

	filesPathList := make([]string, len(filesPathListResponse))

	for i, entry := range filesPathListResponse {
		filesPathList[i] = string(entry.FinalValue)
	}

	// Store in cache
	globalFilePathListCache.set(websiteAddress, filesPathList)

	return filesPathList, nil
}

// getFileLocationKeys fetches and returns the keys for the file locations.
func getFileLocationKeys(client *node.Client, websiteAddress string) ([][]byte, error) {
	addressesInfo, err := node.Addresses(client, []string{websiteAddress})
	if err != nil {
		return nil, fmt.Errorf("converting website address: %w", err)
	}

	addressInfo := addressesInfo[0]
	keys := addressInfo.FinalDatastoreKeys

	var filteredKeys [][]byte

	for _, key := range keys {
		if len(key) > len(storagekeys.FileLocationTag()) && bytes.Equal(key[:len(storagekeys.FileLocationTag())], storagekeys.FileLocationTag()) {
			filteredKeys = append(filteredKeys, key)
		}
	}

	return filteredKeys, nil
}

// fetchAllChunks retrieves all chunks of data for the website.
func fetchAllChunks(client *node.Client, websiteAddress string, filePath string, chunkNumber int32) ([]byte, error) {
	filePathHash := sha256.Sum256([]byte(filePath))

	keys := make([][]byte, chunkNumber)
	for i := 0; i < int(chunkNumber); i++ {
		keys[i] = storagekeys.FileChunkKey(filePathHash[:], i)
	}

	var dataStore []byte
	totalBatches := (int(chunkNumber) + datastoreBatchSize - 1) / datastoreBatchSize

	for batch := 0; batch < totalBatches; batch++ {
		start := batch * datastoreBatchSize

		end := start + datastoreBatchSize
		if end > int(chunkNumber) {
			end = int(chunkNumber)
		}

		batchKeys := keys[start:end]

		response, err := node.ContractDatastoreEntries(client, websiteAddress, batchKeys)
		if err != nil {
			return nil, fmt.Errorf("calling get_datastore_entries '%+v': %w", batchKeys, err)
		}

		if len(response) != len(batchKeys) {
			return nil, fmt.Errorf("expected %d entries, got %d", len(batchKeys), len(response))
		}

		for _, entry := range response {
			if len(entry.FinalValue) == 0 {
				return nil, fmt.Errorf("empty chunk")
			}

			dataStore = append(dataStore, entry.FinalValue...)
		}

		logger.Debugf("Processed batch %d/%d", batch+1, totalBatches)
	}

	return dataStore, nil
}

// GetOwner retrieves the owner of the website.
func GetOwner(network *msConfig.NetworkInfos, websiteAddress string) (string, error) {
	client := node.NewClient(network.NodeURL)

	ownerResponse, err := node.FetchDatastoreEntry(client, websiteAddress, convert.ToBytes(ownerKey))
	if err != nil {
		return "", fmt.Errorf("fetching website owner: %w", err)
	}

	return string(ownerResponse.FinalValue), nil
}

// GetLastUpdateTimestamp retrieves the last update timestamp of the website.
func GetLastUpdateTimestamp(network *msConfig.NetworkInfos, websiteAddress string) (*time.Time, error) {
	client := node.NewClient(network.NodeURL)

	lastUpdateTimestampResponse, err := node.FetchDatastoreEntry(client, websiteAddress, storagekeys.GlobalMetadataKey(lastUpdateTimestampKey))
	if err != nil {
		return nil, fmt.Errorf("fetching website last update timestamp: %w", err)
	}

	if lastUpdateTimestampResponse.FinalValue == nil {
		return nil, fmt.Errorf("last update timestamp not found")
	}

	timestampStr := string(lastUpdateTimestampResponse.FinalValue)

	castedLUTimestamp, err := strconv.ParseUint(timestampStr, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("converting website last update timestamp: %w", err)
	}

	timestamp := time.Unix(int64(castedLUTimestamp), 0)

	return &timestamp, nil
}

// Check if the requested filePath exists in the SC FilesPathList
func FilePathExists(network *msConfig.NetworkInfos, websiteAddress string, filePath string) (bool, error) {
	// Try to get from cache first
	if files, exists := globalFilePathListCache.get(websiteAddress); exists {
		_, exists := files[filePath]
		return exists, nil
	}

	// If not in cache, fetch from chain
	client := node.NewClient(network.NodeURL)
	if client == nil {
		return false, fmt.Errorf("failed to create node client")
	}

	files, err := GetFilesPathList(client, websiteAddress)
	if err != nil {
		return false, fmt.Errorf("failed to get files path list: %w", err)
	}

	// Store in cache for future use
	globalFilePathListCache.set(websiteAddress, files)

	// Return the result from cache
	if files, exists := globalFilePathListCache.get(websiteAddress); exists {
		_, exists := files[filePath]
		return exists, nil
	}

	return false, nil
}
