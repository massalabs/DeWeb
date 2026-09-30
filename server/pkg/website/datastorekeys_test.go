package website

import (
	"bytes"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"sort"
	"sync/atomic"
	"testing"

	msConfig "github.com/massalabs/deweb-server/pkg/config"
	"github.com/massalabs/deweb-server/pkg/website/storagekeys"
	"github.com/massalabs/station/pkg/node"
)

// datastoreNode is a fake node holding the final datastore of one address. It answers
// get_addresses_datastore_keys like a node with max_datastore_keys_query = 500: prefix filter,
// exclusive or inclusive start key, and a count above 500 rejected. get_addresses is refused, so
// that a test fails if the server goes back to it.
type datastoreNode struct {
	entries  map[string][]byte
	keyCalls atomic.Int64
}

func newDatastoreNode(t *testing.T) (*datastoreNode, *httptest.Server) {
	t.Helper()

	fake := &datastoreNode{entries: make(map[string][]byte)}

	srv := httptest.NewServer(http.HandlerFunc(fake.serve))
	t.Cleanup(srv.Close)

	return fake, srv
}

func (f *datastoreNode) set(key []byte, value []byte) {
	f.entries[string(key)] = value
}

type keysRequest struct {
	Prefix            []byte `json:"prefix"`
	StartKey          []byte `json:"start_key"`
	InclusiveStartKey *bool  `json:"inclusive_start_key"`
	Count             uint32 `json:"count"`
}

type entryRequest struct {
	Key []byte `json:"key"`
}

func (f *datastoreNode) serve(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ID     json.RawMessage `json:"id"`
		Method string          `json:"method"`
		Params json.RawMessage `json:"params"`
	}

	_ = json.NewDecoder(r.Body).Decode(&req)

	w.Header().Set("Content-Type", "application/json")

	result, errMsg := f.handle(req.Method, req.Params)
	if errMsg != "" {
		_, _ = fmt.Fprintf(w, `{"jsonrpc":"2.0","id":%s,"error":{"code":-32000,"message":%q}}`, string(req.ID), errMsg)

		return
	}

	body, _ := json.Marshal(result)
	_, _ = fmt.Fprintf(w, `{"jsonrpc":"2.0","id":%s,"result":%s}`, string(req.ID), body)
}

func (f *datastoreNode) handle(method string, params json.RawMessage) (interface{}, string) {
	switch method {
	case "get_addresses_datastore_keys":
		f.keyCalls.Add(1)

		var requests [1][]keysRequest
		if err := json.Unmarshal(params, &requests); err != nil || len(requests[0]) != 1 {
			return nil, fmt.Sprintf("invalid params %s", params)
		}

		return []map[string]interface{}{{"keys": f.keys(requests[0][0])}}, f.checkCount(requests[0][0])

	case "get_datastore_entries":
		var requests [1][]entryRequest
		if err := json.Unmarshal(params, &requests); err != nil {
			return nil, fmt.Sprintf("invalid params %s", params)
		}

		values := make([]map[string]interface{}, len(requests[0]))
		for i, entry := range requests[0] {
			values[i] = map[string]interface{}{"candidate_value": nil, "final_value": f.entries[string(entry.Key)]}
		}

		return values, ""

	default:
		return nil, "unexpected method " + method
	}
}

func (f *datastoreNode) checkCount(request keysRequest) string {
	if request.Count == 0 || request.Count > datastoreKeysPageSize {
		return fmt.Sprintf("max item count in datastore key query is 500 but %d items were queried", request.Count)
	}

	return ""
}

// keys returns the keys matching request as JSON number arrays, like the node does.
func (f *datastoreNode) keys(request keysRequest) [][]int {
	sorted := make([]string, 0, len(f.entries))
	for key := range f.entries {
		sorted = append(sorted, key)
	}

	sort.Strings(sorted)

	inclusive := request.InclusiveStartKey == nil || *request.InclusiveStartKey
	keys := [][]int{}

	for _, key := range sorted {
		if uint32(len(keys)) == request.Count {
			break
		}

		if !bytes.HasPrefix([]byte(key), request.Prefix) {
			continue
		}

		if request.StartKey != nil {
			cmp := bytes.Compare([]byte(key), request.StartKey)
			if cmp < 0 || (cmp == 0 && !inclusive) {
				continue
			}
		}

		asInts := make([]int, len(key))
		for i := 0; i < len(key); i++ {
			asInts[i] = int(key[i])
		}

		keys = append(keys, asInts)
	}

	return keys
}

func TestFinalDatastoreKeysPagesThroughEveryKey(t *testing.T) {
	fake, srv := newDatastoreNode(t)
	prefix := []byte("\x02LOCATION")

	for i := 0; i < 1201; i++ {
		fake.set(append(append([]byte{}, prefix...), []byte(fmt.Sprintf("%05d", i))...), nil)
	}

	// Keys outside the prefix, before and after it in byte order.
	for i := 0; i < 700; i++ {
		fake.set([]byte(fmt.Sprintf("\x01FILE%05d", i)), nil)
		fake.set([]byte(fmt.Sprintf("\x06GM%05d", i)), nil)
	}

	keys, err := finalDatastoreKeys(node.NewClient(srv.URL), "AS_site", prefix)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(keys) != 1201 {
		t.Fatalf("expected 1201 keys, got %d", len(keys))
	}

	for i, key := range keys {
		want := string(prefix) + fmt.Sprintf("%05d", i)
		if string(key) != want {
			t.Fatalf("key %d: expected %q, got %q", i, want, key)
		}
	}

	// 500 + 500 + 201.
	if calls := fake.keyCalls.Load(); calls != 3 {
		t.Fatalf("expected 3 get_addresses_datastore_keys calls, got %d", calls)
	}
}

func TestFinalDatastoreKeysFullLastPage(t *testing.T) {
	fake, srv := newDatastoreNode(t)

	for i := 0; i < datastoreKeysPageSize; i++ {
		fake.set([]byte(fmt.Sprintf("k%05d", i)), nil)
	}

	keys, err := finalDatastoreKeys(node.NewClient(srv.URL), "AS_site", []byte("k"))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(keys) != datastoreKeysPageSize {
		t.Fatalf("expected %d keys, got %d", datastoreKeysPageSize, len(keys))
	}

	// A full page cannot tell that the range is exhausted: one more, empty, page is read.
	if calls := fake.keyCalls.Load(); calls != 2 {
		t.Fatalf("expected 2 get_addresses_datastore_keys calls, got %d", calls)
	}
}

func TestFinalDatastoreKeysEmpty(t *testing.T) {
	_, srv := newDatastoreNode(t)

	keys, err := finalDatastoreKeys(node.NewClient(srv.URL), "AS_site", []byte("k"))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(keys) != 0 {
		t.Fatalf("expected no keys, got %d", len(keys))
	}
}

func TestFinalDatastoreKeysReturnsNodeError(t *testing.T) {
	_, srv := newDatastoreNode(t)
	client := node.NewClient(srv.URL)

	_, err := fetchDatastoreKeysPage(client, datastoreKeysRequest{Address: "AS_site", Count: datastoreKeysPageSize + 1})
	if err == nil {
		t.Fatalf("expected the node to reject a count above its maximum")
	}
}

// setChunkKeys fills the datastore with more chunk keys than one page. They sort before the
// location and metadata keys, so a server reading only the first page of the whole datastore
// (what get_addresses returns on a node with the default config) never sees the latter.
func setChunkKeys(fake *datastoreNode, n int) {
	for i := 0; i < n; i++ {
		hash := sha256.Sum256([]byte(fmt.Sprintf("big%d.bin", i)))
		fake.set(storagekeys.FileChunkKey(hash[:], 0), []byte("chunk"))
	}
}

func TestGetFilesPathListPastOnePage(t *testing.T) {
	prevCache := globalFilePathListCache
	globalFilePathListCache = &filePathListCache{cache: make(map[string]*filePathListCacheEntry)}

	t.Cleanup(func() { globalFilePathListCache = prevCache })

	fake, srv := newDatastoreNode(t)
	setChunkKeys(fake, 600)

	want := make(map[string]bool)

	for i := 0; i < 700; i++ {
		path := fmt.Sprintf("assets/file%d.js", i)
		hash := sha256.Sum256([]byte(path))
		fake.set(append(storagekeys.FileLocationTag(), hash[:]...), []byte(path))
		want[path] = true
	}

	files, err := GetFilesPathList(node.NewClient(srv.URL), "AS_site")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(files) != len(want) {
		t.Fatalf("expected %d files, got %d", len(want), len(files))
	}

	for _, file := range files {
		if !want[file] {
			t.Fatalf("unexpected file %q", file)
		}
	}
}

func TestGetHttpHeadersPastOnePage(t *testing.T) {
	fake, srv := newDatastoreNode(t)
	setChunkKeys(fake, 600)

	const filePath = "index.html"

	fileHash := sha256.Sum256([]byte(filePath))

	fake.set(storagekeys.GlobalMetadataKey(httpHeaderPrefix+"Cache-Control"), []byte("max-age=60"))
	fake.set(storagekeys.GlobalMetadataKey(httpHeaderPrefix+"X-Frame-Options"), []byte("DENY"))
	fake.set(storagekeys.FileMetadataKey(fileHash, httpHeaderPrefix+"Cache-Control"), []byte("no-cache"))

	// Headers of another file must not leak into this one.
	otherHash := sha256.Sum256([]byte("other.html"))
	fake.set(storagekeys.FileMetadataKey(otherHash, httpHeaderPrefix+"X-Other"), []byte("1"))

	headers, err := GetHttpHeaders(&msConfig.NetworkInfos{NodeURL: srv.URL}, "AS_site", filePath)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	want := map[string]string{
		"Cache-Control":   "no-cache", // the file header overrides the global one
		"X-Frame-Options": "DENY",
	}

	if len(headers) != len(want) {
		t.Fatalf("expected headers %v, got %v", want, headers)
	}

	for key, value := range want {
		if headers[key] != value {
			t.Fatalf("header %q: expected %q, got %q", key, value, headers[key])
		}
	}
}
