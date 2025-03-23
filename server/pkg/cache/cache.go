package cache

import (
	"bytes"
	"encoding/binary"
	"fmt"
	"hash/fnv"
	"os"
	"path/filepath"
	"sync"
	"time"

	lru "github.com/hashicorp/golang-lru"
	"go.etcd.io/bbolt"
)

const (
	// DB tags for different types of data
	entryTag          = 0x01
	entrySubTagID     = 0x01 // Subtag for entry ID counter
	entrySubTagData   = 0x02 // Subtag for entry data
	entrySubTagTime   = 0x03 // Subtag for entry timestamp
	idCounterIndexTag = 0x02
	entryCountTag     = 0x03

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
	db       *bbolt.DB
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

		// Initialize RAM cache with uint64 type for FNV hash
		ramCache, err := lru.NewWithEvict(int(maxRAMEntries), func(key interface{}, value interface{}) {
			// Eviction callback
		})
		if err != nil {
			initErr = fmt.Errorf("failed to create LRU cache: %v", err)
			return
		}

		// Initialize BBolt database
		dbPath := filepath.Join(cacheDir, "cache.db")
		db, err := bbolt.Open(dbPath, 0600, nil)
		if err != nil {
			initErr = fmt.Errorf("failed to open BBolt database: %v", err)
			return
		}

		// Initialize cache instance
		instance = &Cache{
			ramCache:      ramCache,
			db:            db,
			maxRAMEntries: maxRAMEntries,
			maxDiskEntries: maxDiskEntries,
		}

		// Initialize or load the entry count and ID counter
		err = db.Update(func(tx *bbolt.Tx) error {
			// Create bucket if it doesn't exist
			entryBucket, err := tx.CreateBucketIfNotExists([]byte{entryBucketID})
			if err != nil {
				return fmt.Errorf("failed to create entry bucket: %v", err)
			}

			// Load or initialize entry count
			entryCountValue := entryBucket.Get([]byte{entryCountTag})
			if entryCountValue == nil {
				// Initialize entry count to 0
				entryCountValue = make([]byte, 8)
				binary.BigEndian.PutUint64(entryCountValue, 0)
				if err := entryBucket.Put([]byte{entryCountTag}, entryCountValue); err != nil {
					return fmt.Errorf("failed to initialize entry count: %v", err)
				}
			}
			instance.entryCount = binary.BigEndian.Uint64(entryCountValue)

			// Find the highest existing ID counter value or set to 0 if no entries exist
			cursor := entryBucket.Cursor()
			seekKey := []byte{idCounterIndexTag + 1}
			cursor.Seek(seekKey)
			k, _ := cursor.Prev()
			if k != nil && len(k) > 0 && k[0] == idCounterIndexTag {
				instance.idCounter = binary.BigEndian.Uint64(k[1:]) + 1
			} else {
				instance.idCounter = 0
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
	err := c.db.View(func(tx *bbolt.Tx) error {
		entryBucket := tx.Bucket([]byte{entryBucketID})
		if entryBucket == nil {
			return fmt.Errorf("entry bucket not found")
		}

		// Create the entry key prefix
		entryKeyPrefix := append([]byte{entryTag}, diskKey...)

		// Get the timestamp
		timestampKey := append(entryKeyPrefix, entrySubTagTime)
		timestampValue := entryBucket.Get(timestampKey)
		if timestampValue == nil {
			return fmt.Errorf("timestamp not found for file %s in website %s", fileName, websiteAddress)
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

	// If not in RAM cache, read disk cache without promoting
	var content []byte
	var timestamp []byte
	err := c.db.View(func(tx *bbolt.Tx) error {
		entryBucket := tx.Bucket([]byte{entryBucketID})
		if entryBucket == nil {
			return fmt.Errorf("entry bucket not found")
		}

		// Create the entry key prefix
		entryKeyPrefix := append([]byte{entryTag}, diskKey...)

		// Get the data
		dataKey := append(entryKeyPrefix, entrySubTagData)
		content = entryBucket.Get(dataKey)
		if content == nil {
			return fmt.Errorf("file %s not found in cache for website %s", resourceName, websiteAddress)
		}

		// Get the timestamp
		timestampKey := append(entryKeyPrefix, entrySubTagTime)
		timestamp = entryBucket.Get(timestampKey)
		if timestamp == nil {
			return fmt.Errorf("timestamp not found for file %s in website %s", resourceName, websiteAddress)
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	// Remove from disk
	err = c.db.Update(func(tx *bbolt.Tx) error {
		return c.deleteEntryFromDisk(tx, diskKey)
	})

	if err != nil {
		return nil, fmt.Errorf("failed to remove from disk cache: %v", err)
	}

	// Create a cache entry and add it to RAM cache
	entry := &cacheEntry{
		content:  content,
		modified: time.Unix(0, int64(binary.BigEndian.Uint64(timestamp))),
	}

	// Add to RAM cache, handling eviction if needed
	if evicted := c.ramCache.Add(key, entry); evicted {
		evictedEntry := entry

		// Save evicted entry to disk as the newest entry
		err = c.db.Update(func(tx *bbolt.Tx) error {
			// Check if we need to evict the oldest entry from disk
			if c.entryCount >= c.maxDiskEntries {
				if err := c.evictOldestEntry(tx); err != nil {
					return err
				}
			}

			return c.saveEntryToDisk(tx, diskKey, evictedEntry)
		})

		if err != nil {
			return nil, fmt.Errorf("failed to save evicted entry to disk: %v", err)
		}
	}

	return content, nil
}

// deleteEntryFromDisk removes an entry from the disk cache
func (c *Cache) deleteEntryFromDisk(tx *bbolt.Tx, key []byte) error {
	entryBucket := tx.Bucket([]byte{entryBucketID})
	if entryBucket == nil {
		return fmt.Errorf("entry bucket not found")
	}

	// Create the entry key prefix
	entryKeyPrefix := append([]byte{entryTag}, key...)

	// Get the ID counter for this entry
	idCounterKey := append(entryKeyPrefix, entrySubTagID)
	idCounterValue := entryBucket.Get(idCounterKey)
	if idCounterValue == nil {
		return nil // Entry not found in disk cache
	}

	// Delete all entries for this key
	cursor := entryBucket.Cursor()
	for k, _ := cursor.Seek(entryKeyPrefix); k != nil && bytes.HasPrefix(k, entryKeyPrefix); k, _ = cursor.Next() {
		if err := entryBucket.Delete(k); err != nil {
			return fmt.Errorf("failed to delete entry: %v", err)
		}
	}

	// Delete the ID counter index entry
	idCounterIndexKey := append([]byte{idCounterIndexTag}, idCounterValue...)
	if err := entryBucket.Delete(idCounterIndexKey); err != nil {
		return fmt.Errorf("failed to delete ID counter index: %v", err)
	}

	// Update entry count
	c.entryCount--
	entryCountValue := make([]byte, 8)
	binary.BigEndian.PutUint64(entryCountValue, c.entryCount)
	if err := entryBucket.Put([]byte{entryCountTag}, entryCountValue); err != nil {
		return fmt.Errorf("failed to update entry count: %v", err)
	}

	return nil
}

// saveEntryToDisk saves an entry to the disk cache
func (c *Cache) saveEntryToDisk(tx *bbolt.Tx, key []byte, entry *cacheEntry) error {
	entryBucket := tx.Bucket([]byte{entryBucketID})
	if entryBucket == nil {
		return fmt.Errorf("entry bucket not found")
	}

	// Create the entry key prefix
	entryKeyPrefix := append([]byte{entryTag}, key...)

	// Save the ID counter
	idCounterKey := append(entryKeyPrefix, entrySubTagID)
	idCounterValue := make([]byte, 8)
	binary.BigEndian.PutUint64(idCounterValue, c.idCounter)
	if err := entryBucket.Put(idCounterKey, idCounterValue); err != nil {
		return fmt.Errorf("failed to save ID counter: %v", err)
	}

	// Save the data
	dataKey := append(entryKeyPrefix, entrySubTagData)
	if err := entryBucket.Put(dataKey, entry.content); err != nil {
		return fmt.Errorf("failed to save data: %v", err)
	}

	// Save the timestamp
	timestampKey := append(entryKeyPrefix, entrySubTagTime)
	timestampValue := make([]byte, 8)
	binary.BigEndian.PutUint64(timestampValue, uint64(entry.modified.UnixNano()))
	if err := entryBucket.Put(timestampKey, timestampValue); err != nil {
		return fmt.Errorf("failed to save timestamp: %v", err)
	}

	// Save the ID counter index
	idCounterIndexKey := append([]byte{idCounterIndexTag}, idCounterValue...)
	if err := entryBucket.Put(idCounterIndexKey, key); err != nil {
		return fmt.Errorf("failed to save ID counter index: %v", err)
	}

	// Update entry count
	c.entryCount++
	entryCountValue := make([]byte, 8)
	binary.BigEndian.PutUint64(entryCountValue, c.entryCount)
	if err := entryBucket.Put([]byte{entryCountTag}, entryCountValue); err != nil {
		return fmt.Errorf("failed to update entry count: %v", err)
	}

	// Increment ID counter
	c.idCounter++

	return nil
}

// evictOldestEntry removes the oldest entry from the disk cache
func (c *Cache) evictOldestEntry(tx *bbolt.Tx) error {
	entryBucket := tx.Bucket([]byte{entryBucketID})
	if entryBucket == nil {
		return fmt.Errorf("entry bucket not found")
	}

	// Find the oldest entry by looking at the lowest ID counter index
	cursor := entryBucket.Cursor()
	seekKey := []byte{idCounterIndexTag}
	k, v := cursor.Seek(seekKey)
	if k == nil || len(k) == 0 || k[0] != idCounterIndexTag {
		return nil // No entries to evict
	}

	// Delete the entry using the existing function
	return c.deleteEntryFromDisk(tx, v)
}

// Save a resource in the cache for a given website
func (c *Cache) Save(websiteAddress string, resourceName string, content []byte, modified time.Time) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	key := getHashKey(websiteAddress, resourceName)
	diskKey := getCacheKey(websiteAddress, resourceName)
	entry := &cacheEntry{
		content:  content,
		modified: modified,
	}

	// Remove any existing entry from RAM cache
	c.ramCache.Remove(key)

	// Remove any existing entry from disk cache
	err := c.db.Update(func(tx *bbolt.Tx) error {
		return c.deleteEntryFromDisk(tx, diskKey)
	})

	if err != nil {
		return fmt.Errorf("failed to remove existing entry from disk cache: %v", err)
	}

	// Add the new entry to RAM cache
	evicted := c.ramCache.Add(key, entry)

	// If an entry was evicted from RAM cache, save it to disk
	if evicted {
		// Get the evicted entry from the cache
		evictedEntry := entry

		// Save to disk cache
		err = c.db.Update(func(tx *bbolt.Tx) error {
			// Check if we need to evict the oldest entry from disk
			if c.entryCount >= c.maxDiskEntries {
				if err := c.evictOldestEntry(tx); err != nil {
					return err
				}
			}

			return c.saveEntryToDisk(tx, diskKey, evictedEntry)
		})

		if err != nil {
			return fmt.Errorf("failed to save to disk cache: %v", err)
		}
	}

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
	err := c.db.Update(func(tx *bbolt.Tx) error {
		return c.deleteEntryFromDisk(tx, diskKey)
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
		err := c.db.Update(func(tx *bbolt.Tx) error {
			// Check if we need to evict the oldest entry from disk
			if c.entryCount >= c.maxDiskEntries {
				if err := c.evictOldestEntry(tx); err != nil {
					return err
				}
			}

			// Create a unique key for this entry
			diskKey := make([]byte, 8)
			binary.BigEndian.PutUint64(diskKey, key.(uint64))
			return c.saveEntryToDisk(tx, diskKey, entry)
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
	content  []byte
	modified time.Time
}
