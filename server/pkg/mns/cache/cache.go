// Package cache provides an expirable LRU cache for MNS mns resolutions.
//
// The package provides a cache implementation that can be instantiated multiple times,
// allowing for different caches per network or use case. Each cache instance is thread-safe
// and can be used from multiple goroutines.
//
// Example usage:
//
//	// Create a new cache instance
//	MNSCache := cache.NewMNSCache(30*time.Second, 2000)
//
//	// Get a mns resolution
//	if address, ok := MNSCache.Get("mymns"); ok {
//	    // Use cached address
//	}
//
//	// Set a mns resolution
//	MNSCache.Set("mymns", "AS...")
//
// The cache is designed to be instantiated multiple times to provide:
//   - Network-specific caching (e.g., different caches for mainnet and testnet)
//   - Flexible TTL and size limits per instance
//   - Memory isolation between different cache instances
package cache

import (
	"time"

	"github.com/hashicorp/golang-lru/v2/expirable"
	"github.com/massalabs/station/pkg/logger"
)

// DefaultMNSCacheTTL is the default time-to-live for cached entries.
// After this duration, entries will be automatically evicted.
const DefaultMNSCacheTTL = 16 * time.Second

// DefaultMNSCacheSize is the default maximum number of entries
// the cache can hold. When this limit is reached, the least recently
// used entry will be evicted.
const DefaultMNSCacheSize = 1000

// MNSCache represents a cache for mns resolutions.
// Each instance is thread-safe and can be used independently.
type MNSCache struct {
	cache *expirable.LRU[string, string]
}

// NewMNSCache creates a new mns resolution cache with given TTL and size.
// If ttl is 0, DefaultMNSCacheTTL is used.
// If size is 0, DefaultMNSCacheSize is used.
func NewMNSCache(ttl time.Duration, size int) *MNSCache {
	if ttl == 0 {
		ttl = DefaultMNSCacheTTL
	}

	if size == 0 {
		size = DefaultMNSCacheSize
	}

	cache := expirable.NewLRU[string, string](size, nil, ttl)
	logger.Infof("Created new mns resolution cache with TTL: %v, size: %d", ttl, size)

	return &MNSCache{cache: cache}
}

// Get retrieves a mns resolution from cache.
// It returns the cached address and a boolean indicating whether
// the mns was found in cache.
func (dc *MNSCache) Get(mns string) (string, bool) {
	return dc.cache.Get(mns)
}

// Set stores a mns resolution in cache.
// The entry will be automatically evicted after the cache's TTL
// or when the cache reaches its size limit.
func (dc *MNSCache) Set(mns string, address string) {
	dc.cache.Add(mns, address)
	logger.Debugf("Cached mns resolution for %s: %s", mns, address)
}
