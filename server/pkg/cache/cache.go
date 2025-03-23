package cache

import (
	"encoding/binary"
	"fmt"
	"hash/fnv"
	"os"
	"sync"
	"time"

	lru "github.com/hashicorp/golang-lru"
	"github.com/dgraph-io/badger/v3"
)

const (
	// DB tags for different types of data
	entryTag          = 0x01
	entrySubTagID     = 0x01 // Subtag for entry ID counter
	entrySubTagData   = 0x02 // Subtag for entry data
	entrySubTagTime   = 0x03 // Subtag for entry timestamp
	idCounterIndexTag = 0x02

	// Bucket IDs
	entryBucketID     = 0x10
)

var (
	instance *Cache
	once     sync.Once
)

// Cache represents the dual caching system with RAM and disk storage
type Cache struct {
	ramCache *lru.Cache
	db       *badger.DB
	mu       sync.RWMutex
	// idCounter is a unique counter for each entry in the disk cache
	idCounter uint64
	// entryCount tracks the total number of entries in the disk cache
	entryCount uint64
	// maxRAMEntries is the maximum number of entries in RAM cache
	maxRAMEntries uint64
	// maxDiskEntries is the maximum number of entries in disk cache
	maxDiskEntries uint64
}

// NewCache initializes the cache with configurable maximum sizes for RAM and disk storage
func NewCache(cacheDir string, maxRAMEntries, maxDiskEntries uint64) (*Cache, error) {
	var initErr error
	once.Do(func() {
		// Check if cache directory exists and is writable
		if err := os.MkdirAll(cacheDir, 0755); err != nil {
			initErr = fmt.Errorf("failed to create cache directory: %v", err)
			return
		}

		// Initialize BadgerDB
		opts := badger.DefaultOptions(cacheDir)
		opts.Logger = nil // Disable BadgerDB's logger
		db, err := badger.Open(opts)
		if err != nil {
			initErr = fmt.Errorf("failed to open BadgerDB: %v", err)
			return
		}

		// Initialize cache instance
		instance = &Cache{
			db:            db,
			maxRAMEntries: maxRAMEntries,
			maxDiskEntries: maxDiskEntries,
		}

		// Initialize RAM cache with uint64 type for FNV hash
		ramCache, err := lru.NewWithEvict(int(maxRAMEntries), func(key interface{}, value interface{}) {

			// Handle eviction by saving to disk
			entry, ok := value.(*cacheEntry)
			if !ok {
				return
			}

			// Save evicted entry to disk as the newest entry
			_ = db.Update(func(txn *badger.Txn) error {
				// Check if we need to evict the oldest entry from disk
				for instance.entryCount >= instance.maxDiskEntries {
					if err := instance.evictOldestEntry(txn); err != nil {
						return err
					}
				}

				// Use the stored website and resource names to create the disk key
				return instance.saveEntryToDisk(txn, entry)
			})
		})
		if err != nil {
			initErr = fmt.Errorf("failed to create LRU cache: %v", err)
			return
		}

		// Set the RAM cache after successful initialization
		instance.ramCache = ramCache

		// Initialize or load the ID counter and count entries
		err = db.Update(func(txn *badger.Txn) error {
			// Find the highest existing ID counter value and count entries
			it := txn.NewIterator(badger.DefaultIteratorOptions)
			defer it.Close()

			// Initialize counters
			instance.idCounter = 0
			instance.entryCount = 0

			// Count entries by iterating through all ID counter index entries
			for it.Seek([]byte{idCounterIndexTag}); it.ValidForPrefix([]byte{idCounterIndexTag}); it.Next() {
				key := it.Item().Key()
				if len(key) > 1 {
					id := binary.BigEndian.Uint64(key[1:])
					if id + 1 > instance.idCounter {
						instance.idCounter = id + 1
					}
					instance.entryCount++
				}
			}

			return nil
		})

		if err != nil {
			initErr = fmt.Errorf("failed to initialize database: %v", err)
			return
		}
	})
	return instance, initErr
}

// getCacheKey returns a unique key for a website and resource as a byte slice
func getCacheKey(websiteAddress, resourceName string) []byte {
	// Calculate lengths
	websiteLen := uint64(len(websiteAddress))
	resourceLen := uint64(len(resourceName))

	// Create a buffer with enough capacity for all components
	buf := make([]byte, 8+websiteLen+8+resourceLen)
	offset := 0

	// Write website length (8 bytes)
	binary.BigEndian.PutUint64(buf[offset:], websiteLen)
	offset += 8

	// Write website address
	copy(buf[offset:], websiteAddress)
	offset += int(websiteLen)

	// Write resource length (8 bytes)
	binary.BigEndian.PutUint64(buf[offset:], resourceLen)
	offset += 8

	// Write resource name
	copy(buf[offset:], resourceName)

	return buf
}

// getHashKey returns a uint64 hash for the given website and resource
func getHashKey(websiteAddress, resourceName string) uint64 {
	h := fnv.New64a()
	h.Write([]byte(websiteAddress))
	h.Write([]byte(resourceName))
	return h.Sum64()
}

// GetLastModified returns the last modified time of a resource in the cache for a given website
func (c *Cache) GetLastModified(websiteAddress string, fileName string) (time.Time, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	key := getHashKey(websiteAddress, fileName)
	diskKey := getCacheKey(websiteAddress, fileName)

	// First try RAM cache without promoting
	if value, ok := c.ramCache.Peek(key); ok {
		if entry, ok := value.(*cacheEntry); ok {
			return entry.modified, nil
		}
	}

	// If not in RAM cache, try disk cache without promoting
	var modified time.Time
	err := c.db.View(func(txn *badger.Txn) error {
		// Create the entry key prefix
		entryKeyPrefix := make([]byte, 1+len(diskKey))
		entryKeyPrefix[0] = entryTag
		copy(entryKeyPrefix[1:], diskKey)

		// Create new byte slice for timestamp key
		timestampKey := make([]byte, len(entryKeyPrefix)+1)
		copy(timestampKey, entryKeyPrefix)
		timestampKey[len(entryKeyPrefix)] = entrySubTagTime

		item, err := txn.Get(timestampKey)
		if err == badger.ErrKeyNotFound {
			return fmt.Errorf("timestamp not found for file %s in website %s", fileName, websiteAddress)
		}
		if err != nil {
			return err
		}

		timestampValue, err := item.ValueCopy(nil)
		if err != nil {
			return err
		}

		modified = time.Unix(0, int64(binary.BigEndian.Uint64(timestampValue)))
		return nil
	})

	if err != nil {
		return time.Time{}, err
	}

	return modified, nil
}

// Read returns the content of a resource in the cache for a given website
func (c *Cache) Read(websiteAddress string, resourceName string) ([]byte, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	key := getHashKey(websiteAddress, resourceName)
	diskKey := getCacheKey(websiteAddress, resourceName)

	// First try RAM cache and promote if found
	if value, ok := c.ramCache.Get(key); ok {
		if entry, ok := value.(*cacheEntry); ok {
			return entry.content, nil
		}
	}

	// If not in RAM cache, check disk cache
	var content []byte
	var timestamp []byte
	err := c.db.Update(func(txn *badger.Txn) error {
		// Create the entry key prefix
		entryKeyPrefix := make([]byte, 1+len(diskKey))
		entryKeyPrefix[0] = entryTag
		copy(entryKeyPrefix[1:], diskKey)

		// Create new byte slices for each key to avoid array modification issues
		dataKey := make([]byte, len(entryKeyPrefix)+1)
		copy(dataKey, entryKeyPrefix)
		dataKey[len(entryKeyPrefix)] = entrySubTagData

		timestampKey := make([]byte, len(entryKeyPrefix)+1)
		copy(timestampKey, entryKeyPrefix)
		timestampKey[len(entryKeyPrefix)] = entrySubTagTime

		// Get the data
		item, err := txn.Get(dataKey)
		if err == badger.ErrKeyNotFound {
			return fmt.Errorf("file %s not found in cache for website %s", resourceName, websiteAddress)
		}
		if err != nil {
			return err
		}

		content, err = item.ValueCopy(nil)
		if err != nil {
			return err
		}

		// Get the timestamp
		item, err = txn.Get(timestampKey)
		if err == badger.ErrKeyNotFound {
			return fmt.Errorf("timestamp not found for file %s in website %s", resourceName, websiteAddress)
		}
		if err != nil {
			return err
		}

		timestamp, err = item.ValueCopy(nil)
		if err != nil {
			return err
		}

		// Remove from disk
		return c.deleteEntryFromDisk(txn, diskKey)
	})

	if err != nil {
		return nil, err
	}

	// Create a cache entry
	entry := &cacheEntry{
		content:        content,
		modified:       time.Unix(0, int64(binary.BigEndian.Uint64(timestamp))),
		websiteAddress: websiteAddress,
		resourceName:   resourceName,
	}

	// Add to RAM cache - eviction will be handled automatically by the callback
	c.ramCache.Add(key, entry)

	return content, nil
}

// deleteEntryFromDisk removes an entry from the disk cache
func (c *Cache) deleteEntryFromDisk(txn *badger.Txn, key []byte) error {
	// Create the entry key prefix
	entryKeyPrefix := make([]byte, 1+len(key))
	entryKeyPrefix[0] = entryTag
	copy(entryKeyPrefix[1:], key)

	// Get the ID counter for this entry
	idCounterKey := make([]byte, len(entryKeyPrefix)+1)
	copy(idCounterKey, entryKeyPrefix)
	idCounterKey[len(entryKeyPrefix)] = entrySubTagID

	item, err := txn.Get(idCounterKey)
	if err == badger.ErrKeyNotFound {
		return nil // Entry not found in disk cache
	}
	if err != nil {
		return err
	}

	idCounterValue, err := item.ValueCopy(nil)
	if err != nil {
		return err
	}

	// Create data and timestamp keys
	dataKey := make([]byte, len(entryKeyPrefix)+1)
	copy(dataKey, entryKeyPrefix)
	dataKey[len(entryKeyPrefix)] = entrySubTagData

	timestampKey := make([]byte, len(entryKeyPrefix)+1)
	copy(timestampKey, entryKeyPrefix)
	timestampKey[len(entryKeyPrefix)] = entrySubTagTime

	// Delete the ID counter entry
	if err := txn.Delete(idCounterKey); err != nil {
		return fmt.Errorf("failed to delete ID counter entry: %v", err)
	}

	// Delete the data entry
	if err := txn.Delete(dataKey); err != nil {
		return fmt.Errorf("failed to delete data entry: %v", err)
	}

	// Delete the timestamp entry
	if err := txn.Delete(timestampKey); err != nil {
		return fmt.Errorf("failed to delete timestamp entry: %v", err)
	}

	// Delete the ID counter index entry
	idCounterIndexKey := make([]byte, 1+len(idCounterValue))
	idCounterIndexKey[0] = idCounterIndexTag
	copy(idCounterIndexKey[1:], idCounterValue)
	if err := txn.Delete(idCounterIndexKey); err != nil {
		return fmt.Errorf("failed to delete ID counter index: %v", err)
	}

	// Update entry count in memory only
	if c.entryCount > 0 {
		c.entryCount--
	}

	return nil
}

// saveEntryToDisk saves an entry to the disk cache
func (c *Cache) saveEntryToDisk(txn *badger.Txn, entry *cacheEntry) error {
	// Compute the key from the entry contents
	key := getCacheKey(entry.websiteAddress, entry.resourceName)

	// Create the entry key prefix
	entryKeyPrefix := append([]byte{entryTag}, key...)

	// Create new byte slices for each key to avoid array modification issues
	idCounterKey := make([]byte, len(entryKeyPrefix)+1)
	copy(idCounterKey, entryKeyPrefix)
	idCounterKey[len(entryKeyPrefix)] = entrySubTagID

	dataKey := make([]byte, len(entryKeyPrefix)+1)
	copy(dataKey, entryKeyPrefix)
	dataKey[len(entryKeyPrefix)] = entrySubTagData

	timestampKey := make([]byte, len(entryKeyPrefix)+1)
	copy(timestampKey, entryKeyPrefix)
	timestampKey[len(entryKeyPrefix)] = entrySubTagTime

	// Save the ID counter
	idCounterValue := make([]byte, 8)
	binary.BigEndian.PutUint64(idCounterValue, c.idCounter)
	if err := txn.Set(idCounterKey, idCounterValue); err != nil {
		return fmt.Errorf("failed to save ID counter: %v", err)
	}

	// Save the data
	if err := txn.Set(dataKey, entry.content); err != nil {
		return fmt.Errorf("failed to save data: %v", err)
	}

	// Save the timestamp
	timestampValue := make([]byte, 8)
	binary.BigEndian.PutUint64(timestampValue, uint64(entry.modified.UnixNano()))
	if err := txn.Set(timestampKey, timestampValue); err != nil {
		return fmt.Errorf("failed to save timestamp: %v", err)
	}

	// Save the ID counter index
	idCounterIndexKey := make([]byte, 1+8)
	idCounterIndexKey[0] = idCounterIndexTag
	binary.BigEndian.PutUint64(idCounterIndexKey[1:], c.idCounter)
	if err := txn.Set(idCounterIndexKey, key); err != nil {
		return fmt.Errorf("failed to save ID counter index: %v", err)
	}

	// Update entry count in memory only
	c.entryCount++

	// Increment ID counter
	c.idCounter++

	return nil
}

// evictOldestEntry removes the oldest entry from the disk cache
func (c *Cache) evictOldestEntry(txn *badger.Txn) error {
	it := txn.NewIterator(badger.DefaultIteratorOptions)
	defer it.Close()

	// Find the oldest entry by looking at the lowest ID counter index
	seekKey := []byte{idCounterIndexTag}
	it.Seek(seekKey)
	if !it.ValidForPrefix(seekKey) {
		return nil // No entries to evict
	}

	// Get the key to delete
	key, err := it.Item().ValueCopy(nil)
	if err != nil {
		return err
	}

	// Delete the entry using the existing function
	return c.deleteEntryFromDisk(txn, key)
}

// Save a resource in the cache for a given website
func (c *Cache) Save(websiteAddress string, resourceName string, content []byte, modified time.Time) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	key := getHashKey(websiteAddress, resourceName)
	diskKey := getCacheKey(websiteAddress, resourceName)
	entry := &cacheEntry{
		content:        content,
		modified:       modified,
		websiteAddress: websiteAddress,
		resourceName:   resourceName,
	}

	// Remove any existing entry from RAM cache
	c.ramCache.Remove(key)

	// Remove any existing entry from disk cache
	err := c.db.Update(func(txn *badger.Txn) error {
		// print the diskKey
		return c.deleteEntryFromDisk(txn, diskKey)
	})

	if err != nil {
		return fmt.Errorf("failed to remove existing entry from disk cache: %v", err)
	}

	// Add the new entry to RAM cache
	c.ramCache.Add(key, entry)

	return nil
}

// Delete a resource in the cache for a given website
func (c *Cache) Delete(websiteAddress string, resourceName string) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	key := getHashKey(websiteAddress, resourceName)
	diskKey := getCacheKey(websiteAddress, resourceName)

	// Remove from RAM cache
	c.ramCache.Remove(key)

	// Remove from disk cache
	err := c.db.Update(func(txn *badger.Txn) error {
		return c.deleteEntryFromDisk(txn, diskKey)
	})

	if err != nil {
		return fmt.Errorf("failed to delete from disk cache: %v", err)
	}

	return nil
}

// Close saves all RAM cache entries to disk and closes the database
func (c *Cache) Close() error {
	c.mu.Lock()
	defer c.mu.Unlock()

	// Get all keys from RAM cache in LRU order
	keys := c.ramCache.Keys()
	for _, key := range keys {
		// Get the entry from RAM cache
		value, ok := c.ramCache.Peek(key.(uint64))
		if !ok {
			continue
		}
		entry, ok := value.(*cacheEntry)
		if !ok {
			continue
		}

		// Save to disk cache
		err := c.db.Update(func(txn *badger.Txn) error {
			// Keep evicting entries until we have enough space
			for c.entryCount >= c.maxDiskEntries {
				if err := c.evictOldestEntry(txn); err != nil {
					return err
				}
			}

			// Use the stored website and resource names to create the disk key
			return c.saveEntryToDisk(txn, entry)
		})

		if err != nil {
			return fmt.Errorf("failed to save entry to disk cache: %v", err)
		}
	}

	// Close the database
	if err := c.db.Close(); err != nil {
		return fmt.Errorf("failed to close database: %v", err)
	}

	return nil
}

// cacheEntry represents a cached resource with its content and modification time
type cacheEntry struct {
	content         []byte
	modified        time.Time
	websiteAddress  string
	resourceName    string
}
