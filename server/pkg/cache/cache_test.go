package cache

import (
	"bytes"
	"fmt"
	"testing"
	"time"
)

func TestCacheItems(t *testing.T) {
	// Use t.TempDir() which is designed for test isolation
	tmpDir := t.TempDir()

	// Initialize cache
	cache, err := NewCache(tmpDir, 10, 1000)
	if err != nil {
		t.Fatalf("Failed to create cache: %v", err)
	}
	defer cache.Close()

	// Test data
	website := "test-website.com"
	numItems := 100
	items := make(map[string][]byte)

	// Save items to the cache
	for i := 0; i < numItems; i++ {
		fileName := fmt.Sprintf("file%d.txt", i)
		content := []byte(fmt.Sprintf("Content for file %d", i))
		items[fileName] = content
		headers := map[string]string{
			"My-Header": fmt.Sprintf("Value %d", i),
		}

		err = cache.Save(website, fileName, content, time.Now(), headers)
		if err != nil {
			t.Fatalf("Failed to save item %d: %v", i, err)
		}
	}

	// Read all items back and verify their content
	for i := 0; i < numItems; i++ {
		fileName := fmt.Sprintf("file%d.txt", i)
		expectedContent := items[fileName]

		content, headers, err := cache.Read(website, fileName)
		if err != nil {
			t.Fatalf("Failed to read item %d: %v", i, err)
		}

		if !bytes.Equal(content, expectedContent) {
			t.Errorf("Content mismatch for item %d:\nExpected: %s\nGot: %s", i, expectedContent, content)
		}

		if headers["My-Header"] != fmt.Sprintf("Value %d", i) {
			t.Errorf("Header mismatch for item %d:\nExpected: %s\nGot: %s", i, fmt.Sprintf("Value %d", i), headers["My-Header"])
		}

		// Test GetHeader
		headerValue, err := cache.GetHeader(website, fileName, "My-Header")
		if err != nil {
			t.Fatalf("Failed to get header for item %d: %v", i, err)
		}
		if headerValue != fmt.Sprintf("Value %d", i) {
			t.Errorf("Header mismatch for item %d:\nExpected: %s\nGot: %s", i, fmt.Sprintf("Value %d", i), headerValue)
		}

		// Test GetHeadersForResource
		headers, err = cache.GetHeadersForResource(website, fileName)
		if err != nil {
			t.Fatalf("Failed to get headers for item %d: %v", i, err)
		}
		if headers["My-Header"] != fmt.Sprintf("Value %d", i) {
			t.Errorf("Headers mismatch for item %d:\nExpected: %v\nGot: %v", i, map[string]string{"My-Header": fmt.Sprintf("Value %d", i)}, headers)
		}
	}
}
