package cache

import (
	"os"
	"testing"
	"time"
)

func TestCache(t *testing.T) {
	// Create a temporary directory for the test
	tmpDir, err := os.MkdirTemp("", "cache_test")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	// Create a new cache with small limits for testing
	c, err := NewCache(tmpDir, 2, 3) // 2 RAM entries, 3 disk entries
	if err != nil {
		t.Fatalf("Failed to create cache: %v", err)
	}
	defer c.Close()

	// Test data
	testData := []struct {
		website  string
		resource string
		content  []byte
	}{
		{"website1.com", "file1.txt", []byte("content1")},
		{"website2.com", "file2.txt", []byte("content2")},
		{"website3.com", "file3.txt", []byte("content3")},
		{"website4.com", "file4.txt", []byte("content4")},
	}

	// Test 1: Add items and verify they're in RAM cache
	t.Run("Add items to RAM cache", func(t *testing.T) {
		for i := 0; i < 2; i++ {
			err := c.Save(testData[i].website, testData[i].resource, testData[i].content, time.Now())
			if err != nil {
				t.Errorf("Failed to save item %d: %v", i, err)
			}

			// Verify item is in RAM cache
			content, err := c.Read(testData[i].website, testData[i].resource)
			if err != nil {
				t.Errorf("Failed to read item %d from RAM cache: %v", i, err)
			}
			if string(content) != string(testData[i].content) {
				t.Errorf("Content mismatch for item %d: got %s, want %s", i, content, testData[i].content)
			}
		}
	})

	// Test 2: Add more items to trigger disk cache
	t.Run("Add items to disk cache", func(t *testing.T) {
		for i := 2; i < 4; i++ {
			err := c.Save(testData[i].website, testData[i].resource, testData[i].content, time.Now())
			if err != nil {
				t.Errorf("Failed to save item %d: %v", i, err)
			}

			// Verify item is in disk cache
			content, err := c.Read(testData[i].website, testData[i].resource)
			if err != nil {
				t.Errorf("Failed to read item %d from disk cache: %v", i, err)
			}
			if string(content) != string(testData[i].content) {
				t.Errorf("Content mismatch for item %d: got %s, want %s", i, content, testData[i].content)
			}
		}
	})

	// Test 3: Test promotion from disk to RAM
	t.Run("Promote items from disk to RAM", func(t *testing.T) {
		// Read an item from disk cache
		content, err := c.Read(testData[2].website, testData[2].resource)
		if err != nil {
			t.Errorf("Failed to read item for promotion: %v", err)
		}
		if string(content) != string(testData[2].content) {
			t.Errorf("Content mismatch after promotion: got %s, want %s", content, testData[2].content)
		}

		// Verify it's now in RAM cache
		content, err = c.Read(testData[2].website, testData[2].resource)
		if err != nil {
			t.Errorf("Failed to read promoted item: %v", err)
		}
		if string(content) != string(testData[2].content) {
			t.Errorf("Content mismatch after promotion: got %s, want %s", content, testData[2].content)
		}
	})

	// Test 4: Test eviction behavior
	t.Run("Test eviction behavior", func(t *testing.T) {
		// Add a new item to trigger eviction
		newData := struct {
			website  string
			resource string
			content  []byte
		}{"website5.com", "file5.txt", []byte("content5")}

		err := c.Save(newData.website, newData.resource, newData.content, time.Now())
		if err != nil {
			t.Errorf("Failed to save new item: %v", err)
		}

		// Verify the oldest item is evicted from disk
		_, err = c.Read(testData[0].website, testData[0].resource)
		if err == nil {
			t.Error("Expected oldest item to be evicted, but it's still present")
		}
	})

	// Test 5: Test deletion
	t.Run("Test deletion", func(t *testing.T) {
		// Delete an item
		err := c.Delete(testData[1].website, testData[1].resource)
		if err != nil {
			t.Errorf("Failed to delete item: %v", err)
		}

		// Verify it's deleted
		_, err = c.Read(testData[1].website, testData[1].resource)
		if err == nil {
			t.Error("Expected item to be deleted, but it's still present")
		}
	})

	// Test 6: Test cache persistence
	t.Run("Test cache persistence", func(t *testing.T) {
		// Create a new cache instance with the same directory
		c2, err := NewCache(tmpDir, 2, 3)
		if err != nil {
			t.Fatalf("Failed to create new cache: %v", err)
		}
		defer c2.Close()

		// Verify some items are still present
		content, err := c2.Read(testData[3].website, testData[3].resource)
		if err != nil {
			t.Errorf("Failed to read persisted item: %v", err)
		}
		if string(content) != string(testData[3].content) {
			t.Errorf("Content mismatch after persistence: got %s, want %s", content, testData[3].content)
		}
	})
}
