package website

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"sync/atomic"
	"testing"
	"time"

	"github.com/massalabs/deweb-server/int/api/config"
	msConfig "github.com/massalabs/deweb-server/pkg/config"
	"github.com/massalabs/station/pkg/logger"
)

func TestMain(m *testing.M) {
	// Several functions under test emit debug logs through the global logger, which
	// panics if it has not been initialized.
	_ = logger.InitializeGlobal("/dev/null")

	os.Exit(m.Run())
}

// resetLastUpdateCache returns a fresh cache and restores any global config after the test.
func resetLastUpdateCache(t *testing.T) {
	t.Helper()

	prevCache := globalLastUpdateCache
	prevConfig := serverConfig

	globalLastUpdateCache = &lastUpdateCache{cache: make(map[string]lastUpdateCacheEntry)}

	t.Cleanup(func() {
		globalLastUpdateCache = prevCache
		serverConfig = prevConfig
	})
}

func TestLastUpdateCacheGetHitAndExpiry(t *testing.T) {
	resetLastUpdateCache(t)

	now := time.Now()
	addr := "AS_fresh"

	globalLastUpdateCache.cache[addr] = lastUpdateCacheEntry{
		timestamp:  now,
		expiration: now.Add(time.Minute),
	}

	got, ok := globalLastUpdateCache.get(addr)
	if !ok {
		t.Fatalf("expected a cache hit for a non-expired entry")
	}

	if !got.Equal(now) {
		t.Fatalf("expected cached timestamp %v, got %v", now, got)
	}

	// Expired entry must be treated as a miss so updates are eventually picked up.
	expiredAddr := "AS_expired"
	globalLastUpdateCache.cache[expiredAddr] = lastUpdateCacheEntry{
		timestamp:  now,
		expiration: now.Add(-time.Minute),
	}

	if _, ok := globalLastUpdateCache.get(expiredAddr); ok {
		t.Fatalf("expected a cache miss for an expired entry")
	}

	// Unknown address is a miss.
	if _, ok := globalLastUpdateCache.get("AS_unknown"); ok {
		t.Fatalf("expected a cache miss for an unknown address")
	}
}

func TestLastUpdateCacheSetUsesConfiguredTTL(t *testing.T) {
	resetLastUpdateCache(t)

	serverConfig = &config.ServerConfig{
		CacheConfig: config.CacheConfig{LastUpdateCacheDurationSeconds: 30},
	}

	ts := time.Unix(1700000000, 0)
	before := time.Now()
	globalLastUpdateCache.set("AS_ttl", ts)
	after := time.Now()

	entry, ok := globalLastUpdateCache.cache["AS_ttl"]
	if !ok {
		t.Fatalf("expected the entry to be cached")
	}

	if !entry.timestamp.Equal(ts) {
		t.Fatalf("expected stored timestamp %v, got %v", ts, entry.timestamp)
	}

	// Expiration should be roughly now + 30s.
	minExp := before.Add(30 * time.Second)
	maxExp := after.Add(30 * time.Second)
	if entry.expiration.Before(minExp) || entry.expiration.After(maxExp) {
		t.Fatalf("expiration %v not within expected window [%v, %v]", entry.expiration, minExp, maxExp)
	}

	if got, ok := globalLastUpdateCache.get("AS_ttl"); !ok || !got.Equal(ts) {
		t.Fatalf("expected to read back the cached timestamp")
	}
}

// fakeNode stands up a minimal JSON-RPC server that answers get_datastore_entries with a
// configurable timestamp value, and counts how many requests it received.
func fakeNode(t *testing.T, timestamp *atomic.Int64, calls *atomic.Int64) *httptest.Server {
	t.Helper()

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)

		var req struct {
			ID json.RawMessage `json:"id"`
		}
		_ = json.NewDecoder(r.Body).Decode(&req)

		id := req.ID
		if len(id) == 0 {
			id = json.RawMessage("0")
		}

		// final_value is the decimal timestamp string, returned base64-encoded (how
		// encoding/json represents a []byte field).
		value := []byte(fmt.Sprintf("%d", timestamp.Load()))
		encoded := base64.StdEncoding.EncodeToString(value)

		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"jsonrpc":"2.0","id":%s,"result":[{"candidate_value":null,"final_value":%q}]}`, string(id), encoded)
	}))

	t.Cleanup(srv.Close)

	return srv
}

func TestGetLastUpdateTimestampCachesButRefetchesAfterTTL(t *testing.T) {
	resetLastUpdateCache(t)

	serverConfig = &config.ServerConfig{
		CacheConfig: config.CacheConfig{LastUpdateCacheDurationSeconds: 60},
	}

	var ts atomic.Int64
	var calls atomic.Int64
	ts.Store(1700000000)

	srv := fakeNode(t, &ts, &calls)
	network := &msConfig.NetworkInfos{NodeURL: srv.URL}
	const addr = "AS_e2e"

	// First call hits the node.
	got, err := GetLastUpdateTimestamp(network, addr)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !got.Equal(time.Unix(1700000000, 0)) {
		t.Fatalf("expected timestamp %v, got %v", time.Unix(1700000000, 0), got)
	}
	if calls.Load() != 1 {
		t.Fatalf("expected 1 node call, got %d", calls.Load())
	}

	// Simulate an on-chain update, then make several more calls within the TTL: they must
	// all be served from cache (no extra node calls) and must NOT yet see the new value.
	ts.Store(1700000500)
	for i := 0; i < 5; i++ {
		got, err = GetLastUpdateTimestamp(network, addr)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if !got.Equal(time.Unix(1700000000, 0)) {
			t.Fatalf("within TTL expected cached timestamp, got %v", got)
		}
	}
	if calls.Load() != 1 {
		t.Fatalf("expected node to be hit only once within TTL, got %d calls", calls.Load())
	}

	// Expire the cached entry to simulate the TTL elapsing.
	globalLastUpdateCache.mu.Lock()
	entry := globalLastUpdateCache.cache[addr]
	entry.expiration = time.Now().Add(-time.Second)
	globalLastUpdateCache.cache[addr] = entry
	globalLastUpdateCache.mu.Unlock()

	// After the TTL, the node is queried again and the update IS picked up.
	got, err = GetLastUpdateTimestamp(network, addr)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !got.Equal(time.Unix(1700000500, 0)) {
		t.Fatalf("after TTL expected updated timestamp %v, got %v", time.Unix(1700000500, 0), got)
	}
	if calls.Load() != 2 {
		t.Fatalf("expected a second node call after TTL, got %d", calls.Load())
	}
}

func TestLastUpdateCacheSetDisabledWithZeroTTL(t *testing.T) {
	resetLastUpdateCache(t)

	serverConfig = &config.ServerConfig{
		CacheConfig: config.CacheConfig{LastUpdateCacheDurationSeconds: 0},
	}

	globalLastUpdateCache.set("AS_disabled", time.Now())

	if len(globalLastUpdateCache.cache) != 0 {
		t.Fatalf("expected no entry to be cached when TTL is 0, got %d", len(globalLastUpdateCache.cache))
	}

	if _, ok := globalLastUpdateCache.get("AS_disabled"); ok {
		t.Fatalf("expected a cache miss when caching is disabled")
	}
}
