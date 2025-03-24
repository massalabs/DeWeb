package cache

import (
	"fmt"
	"hash/fnv"
	"sync"
	"time"

	lru "github.com/hashicorp/golang-lru"
)

var (
	instance *Cache
	once     sync.Once
)

// Cache represents the dual caching system with RAM and disk storage
type Cache struct {
	ramCache       *lru.Cache
	diskCache      *DiskCache
	mu             sync.RWMutex
	maxRAMEntries  uint64
}

// NewCache initializes the cache with configurable maximum sizes for RAM and disk storage
func NewCache(cacheDir string, maxRAMEntries, maxDiskEntries uint64) (*Cache, error) {
	var initErr error
	once.Do(func() {
		// Initialize disk cache
		diskCache, err := NewDiskCache(cacheDir, maxDiskEntries)
		if err != nil {
			initErr = fmt.Errorf("failed to initialize disk cache: %v", err)
			return
		}

		// Initialize cache instance
		instance = &Cache{
			diskCache:     diskCache,
			maxRAMEntries: maxRAMEntries,
		}

		// Initialize RAM cache with uint64 type for FNV hash
		ramCache, err := lru.NewWithEvict(int(maxRAMEntries), func(key interface{}, value interface{}) {
			// Handle eviction by saving to disk
			entry, ok := value.(*cacheEntry)
			if !ok {
				return
			}

			// Save evicted entry to disk
			_ = instance.diskCache.SaveResource(entry)
		})
		if err != nil {
			initErr = fmt.Errorf("failed to create LRU cache: %v", err)
			return
		}

		// Set the RAM cache after successful initialization
		instance.ramCache = ramCache
	})
	return instance, initErr
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

	// First try RAM cache without promoting
	if value, ok := c.ramCache.Peek(key); ok {
		if entry, ok := value.(*cacheEntry); ok {
			return entry.modified, nil
		}
	}

	// If not in RAM cache, try disk cache without promoting
	modified, err := c.diskCache.GetLastModified(websiteAddress, fileName)
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

	// First try RAM cache and promote if found
	if value, ok := c.ramCache.Get(key); ok {
		if entry, ok := value.(*cacheEntry); ok {
			return entry.content, nil
		}
	}

	// If not in RAM cache, check disk cache and move to RAM cache
	content, modified, err := c.diskCache.RemoveAndGet(websiteAddress, resourceName)
	if err != nil {
		return nil, err
	}

	// Create a cache entry
	entry := &cacheEntry{
		content:        content,
		modified:       modified,
		websiteAddress: websiteAddress,
		resourceName:   resourceName,
	}

	// Add to RAM cache - eviction will be handled automatically by the callback
	c.ramCache.Add(key, entry)

	return content, nil
}

// Save a resource in the cache for a given website
func (c *Cache) Save(websiteAddress string, resourceName string, content []byte, modified time.Time) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	key := getHashKey(websiteAddress, resourceName)
	entry := &cacheEntry{
		content:        content,
		modified:       modified,
		websiteAddress: websiteAddress,
		resourceName:   resourceName,
	}

	// Remove any existing entry from RAM cache
	c.ramCache.Remove(key)

	// Remove any existing entry from disk cache
	if err := c.diskCache.Remove(websiteAddress, resourceName); err != nil {
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

	// Remove from RAM cache
	c.ramCache.Remove(key)

	// Remove from disk cache
	if err := c.diskCache.Remove(websiteAddress, resourceName); err != nil {
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
		if err := c.diskCache.SaveResource(entry); err != nil {
			return fmt.Errorf("failed to save entry to disk cache: %v", err)
		}
	}

	// Close the disk cache
	if err := c.diskCache.Close(); err != nil {
		return fmt.Errorf("failed to close disk cache: %v", err)
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
