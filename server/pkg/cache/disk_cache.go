package cache

import (
	"encoding/binary"
	"fmt"
	"os"
	"time"

	"github.com/dgraph-io/badger/v4"
)

const (
	// DB tags for different types of data
	entryTag          = 0x01
	entrySubTagID     = 0x01 // Subtag for entry ID counter
	entrySubTagData   = 0x02 // Subtag for entry data
	entrySubTagTime   = 0x03 // Subtag for entry timestamp
	idCounterIndexTag = 0x02
)

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

// createEntryPrefix returns a prefix key for a website and resource entry
// Note: We create a new byte slice and copy data rather than using append
// because Badger requires variables within a transaction to have stable
// underlying storage. Modifying slices in-place can cause bugs with Badger
// as it may reference the memory later.
func createEntryPrefix(websiteAddress, resourceName string) []byte {
	cacheKey := getCacheKey(websiteAddress, resourceName)
	prefix := make([]byte, 1+len(cacheKey))
	prefix[0] = entryTag
	copy(prefix[1:], cacheKey)

	return prefix
}

// createIdKey returns a key for an entry's ID counter
// Note: We create a new byte slice and copy data rather than using append
// because Badger requires variables within a transaction to have stable
// underlying storage. Modifying slices in-place can cause bugs with Badger
// as it may reference the memory later.
func createIdKey(entryPrefix []byte) []byte {
	key := make([]byte, len(entryPrefix)+1)
	copy(key, entryPrefix)
	key[len(entryPrefix)] = entrySubTagID

	return key
}

// createDataKey returns a key for an entry's content data
// Note: We create a new byte slice and copy data rather than using append
// because Badger requires variables within a transaction to have stable
// underlying storage. Modifying slices in-place can cause bugs with Badger
// as it may reference the memory later.
func createDataKey(entryPrefix []byte) []byte {
	key := make([]byte, len(entryPrefix)+1)
	copy(key, entryPrefix)
	key[len(entryPrefix)] = entrySubTagData

	return key
}

// createTimestampKey returns a key for an entry's timestamp
// Note: We create a new byte slice and copy data rather than using append
// because Badger requires variables within a transaction to have stable
// underlying storage. Modifying slices in-place can cause bugs with Badger
// as it may reference the memory later.
func createTimestampKey(entryPrefix []byte) []byte {
	key := make([]byte, len(entryPrefix)+1)
	copy(key, entryPrefix)
	key[len(entryPrefix)] = entrySubTagTime

	return key
}

// createIdCounterIndexKey returns a key for an entry in the ID counter index
// Note: We create a new byte slice and copy data rather than using append
// because Badger requires variables within a transaction to have stable
// underlying storage. Modifying slices in-place can cause bugs with Badger
// as it may reference the memory later.
func createIdCounterIndexKey(id uint64) []byte {
	key := make([]byte, 1+8)
	key[0] = idCounterIndexTag
	binary.BigEndian.PutUint64(key[1:], id)

	return key
}

// DiskCache represents the disk storage component of the cache
type DiskCache struct {
	db         *badger.DB
	idCounter  uint64
	entryCount uint64
	maxEntries uint64
}

// NewDiskCache initializes the disk cache with configurable maximum size
func NewDiskCache(cacheDir string, maxEntries uint64) (*DiskCache, error) {
	// Check if cache directory exists and is writable
	if err := os.MkdirAll(cacheDir, 0o755); err != nil {
		return nil, fmt.Errorf("failed to create cache directory: %v", err)
	}

	// Initialize BadgerDB
	opts := badger.DefaultOptions(cacheDir)
	opts.Logger = nil // Disable BadgerDB's logger

	db, err := badger.Open(opts)
	if err != nil {
		return nil, fmt.Errorf("failed to open BadgerDB: %v", err)
	}

	// Initialize disk cache instance
	diskCache := &DiskCache{
		db:         db,
		maxEntries: maxEntries,
	}

	// Initialize or load the ID counter and count entries
	err = db.Update(func(txn *badger.Txn) error {
		// Find the highest existing ID counter value and count entries
		it := txn.NewIterator(badger.DefaultIteratorOptions)
		defer it.Close()

		// Initialize counters
		diskCache.idCounter = 0
		diskCache.entryCount = 0

		// Count entries by iterating through all ID counter index entries
		for it.Seek([]byte{idCounterIndexTag}); it.ValidForPrefix([]byte{idCounterIndexTag}); it.Next() {
			key := it.Item().Key()
			if len(key) > 1 {
				id := binary.BigEndian.Uint64(key[1:])
				if id+1 > diskCache.idCounter {
					diskCache.idCounter = id + 1
				}

				diskCache.entryCount++
			}
		}

		return nil
	})
	if err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to initialize database: %v", err)
	}

	return diskCache, nil
}

// getTimestamp retrieves and parses a timestamp from the database
func (d *DiskCache) getTimestamp(txn *badger.Txn, entryPrefix []byte) (time.Time, error) {
	// Create timestamp key
	timestampKey := createTimestampKey(entryPrefix)

	// Get the timestamp item
	item, err := txn.Get(timestampKey)
	if err == badger.ErrKeyNotFound {
		return time.Time{}, fmt.Errorf("timestamp not found")
	}

	if err != nil {
		return time.Time{}, err
	}

	// Read and parse timestamp value
	timestampValue, err := item.ValueCopy(nil)
	if err != nil {
		return time.Time{}, err
	}

	// Convert binary to time.Time
	return time.Unix(0, int64(binary.BigEndian.Uint64(timestampValue))), nil
}

// GetLastModified returns the last modified time of a resource in the disk cache
func (d *DiskCache) GetLastModified(websiteAddress, resourceName string) (time.Time, error) {
	var modified time.Time

	err := d.db.View(func(txn *badger.Txn) error {
		// Create the entry key prefix
		entryPrefix := createEntryPrefix(websiteAddress, resourceName)

		// Get the timestamp
		timestamp, err := d.getTimestamp(txn, entryPrefix)
		if err != nil {
			return fmt.Errorf("timestamp not found for website %s, resource %s: %v", websiteAddress, resourceName, err)
		}

		modified = timestamp

		return nil
	})
	if err != nil {
		return time.Time{}, err
	}

	return modified, nil
}

// deleteEntry removes an entry from the disk cache
func (d *DiskCache) deleteEntry(txn *badger.Txn, websiteAddress, resourceName string) error {
	// Create the entry key prefix
	entryPrefix := createEntryPrefix(websiteAddress, resourceName)

	// Get the ID counter for this entry
	idCounterKey := createIdKey(entryPrefix)

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
	dataKey := createDataKey(entryPrefix)
	timestampKey := createTimestampKey(entryPrefix)

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
	idCounterIndexKey := createIdCounterIndexKey(binary.BigEndian.Uint64(idCounterValue))
	if err := txn.Delete(idCounterIndexKey); err != nil {
		return fmt.Errorf("failed to delete ID counter index: %v", err)
	}

	// Update entry count in memory only
	if d.entryCount > 0 {
		d.entryCount--
	}

	return nil
}

// saveEntry saves an entry to the disk cache
func (d *DiskCache) saveEntry(txn *badger.Txn, websiteAddress, resourceName string, content []byte, modified time.Time) error {
	// Create the entry key prefix
	entryPrefix := createEntryPrefix(websiteAddress, resourceName)

	// Create keys
	idCounterKey := createIdKey(entryPrefix)
	dataKey := createDataKey(entryPrefix)
	timestampKey := createTimestampKey(entryPrefix)

	// Save the ID counter
	idCounterValue := make([]byte, 8)
	binary.BigEndian.PutUint64(idCounterValue, d.idCounter)

	if err := txn.Set(idCounterKey, idCounterValue); err != nil {
		return fmt.Errorf("failed to save ID counter: %v", err)
	}

	// Save the data
	if err := txn.Set(dataKey, content); err != nil {
		return fmt.Errorf("failed to save data: %v", err)
	}

	// Save the timestamp
	timestampValue := make([]byte, 8)
	binary.BigEndian.PutUint64(timestampValue, uint64(modified.UnixNano()))

	if err := txn.Set(timestampKey, timestampValue); err != nil {
		return fmt.Errorf("failed to save timestamp: %v", err)
	}

	// Save the ID counter index
	idCounterIndexKey := createIdCounterIndexKey(d.idCounter)

	// Create cache key for the index value
	indexValue := getCacheKey(websiteAddress, resourceName)
	if err := txn.Set(idCounterIndexKey, indexValue); err != nil {
		return fmt.Errorf("failed to save ID counter index: %v", err)
	}

	// Update entry count in memory only
	d.entryCount++

	// Increment ID counter
	d.idCounter++

	return nil
}

// evictOldestEntry removes the oldest entry from the disk cache
func (d *DiskCache) evictOldestEntry(txn *badger.Txn) error {
	it := txn.NewIterator(badger.DefaultIteratorOptions)
	defer it.Close()

	// Find the oldest entry by looking at the lowest ID counter index
	seekKey := []byte{idCounterIndexTag}
	it.Seek(seekKey)

	if !it.ValidForPrefix(seekKey) {
		return nil // No entries to evict
	}

	// Get the key to delete
	cacheKey, err := it.Item().ValueCopy(nil)
	if err != nil {
		return err
	}

	// Extract website and resource name from cache key
	websiteLen := binary.BigEndian.Uint64(cacheKey[:8])
	websiteAddress := string(cacheKey[8 : 8+websiteLen])

	resourceOffset := 8 + websiteLen
	resourceLen := binary.BigEndian.Uint64(cacheKey[resourceOffset : resourceOffset+8])
	resourceName := string(cacheKey[resourceOffset+8 : resourceOffset+8+resourceLen])

	// Delete the entry
	return d.deleteEntry(txn, websiteAddress, resourceName)
}

// SaveResource saves a resource to the disk cache, evicting old entries if necessary
func (d *DiskCache) SaveResource(entry *cacheEntry) error {
	return d.db.Update(func(txn *badger.Txn) error {
		// Make sure we have space by evicting old entries if needed
		for d.entryCount >= d.maxEntries {
			if err := d.evictOldestEntry(txn); err != nil {
				return err
			}
		}

		// Delete existing entry if exists
		if err := d.deleteEntry(txn, entry.websiteAddress, entry.resourceName); err != nil {
			return err
		}

		// Save the new entry
		return d.saveEntry(txn, entry.websiteAddress, entry.resourceName, entry.content, entry.modified)
	})
}

// Remove removes a resource from the disk cache
func (d *DiskCache) Remove(websiteAddress, resourceName string) error {
	return d.db.Update(func(txn *badger.Txn) error {
		return d.deleteEntry(txn, websiteAddress, resourceName)
	})
}

// Close closes the database
func (d *DiskCache) Close() error {
	return d.db.Close()
}

// RemoveAndGet retrieves a resource from disk cache, removes it, and returns its content and timestamp
func (d *DiskCache) RemoveAndGet(websiteAddress, resourceName string) ([]byte, time.Time, error) {
	var content []byte
	var modified time.Time

	err := d.db.Update(func(txn *badger.Txn) error {
		// Create the entry key prefix
		entryPrefix := createEntryPrefix(websiteAddress, resourceName)

		// Create data key
		dataKey := createDataKey(entryPrefix)

		// Get the data
		item, err := txn.Get(dataKey)
		if err == badger.ErrKeyNotFound {
			return fmt.Errorf("data not found for website %s, resource %s", websiteAddress, resourceName)
		}

		if err != nil {
			return err
		}

		content, err = item.ValueCopy(nil)
		if err != nil {
			return err
		}

		// Get the timestamp
		timestamp, err := d.getTimestamp(txn, entryPrefix)
		if err != nil {
			return fmt.Errorf("timestamp not found for website %s, resource %s: %v", websiteAddress, resourceName, err)
		}
		modified = timestamp

		// Remove from disk
		return d.deleteEntry(txn, websiteAddress, resourceName)
	})
	if err != nil {
		return nil, time.Time{}, err
	}

	return content, modified, nil
}
