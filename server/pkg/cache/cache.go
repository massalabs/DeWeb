package cache

import (
	"archive/zip"
	"bytes"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"time"

	"github.com/gofrs/flock"
	"github.com/massalabs/station/pkg/logger"
)

// Cache represents the caching system
type Cache struct {
	CacheDir string
}

// NewCache initializes the cache and ensures the cache directory exists
func NewCache(cacheDir string) (*Cache, error) {
	err := os.MkdirAll(cacheDir, os.ModePerm)
	if err != nil {
		return nil, fmt.Errorf("failed to create cache directory %s: %v", cacheDir, err)
	}

	return &Cache{CacheDir: cacheDir}, nil
}

// getArchivePath returns the full path to the website's .zip archive
func (c *Cache) getArchivePath(websiteAddress string) string {
	return filepath.Join(c.CacheDir, websiteAddress+".zip")
}

// newFileLock creates a new file lock for a given archive path
func (c *Cache) newFileLock(archivePath string) *flock.Flock {
	lockFilePath := archivePath + ".lock"

	return flock.New(lockFilePath)
}

// IsPresent returns true if the requested resource is present in the cache for a given website
func (c *Cache) IsPresent(websiteAddress string, resourceName string) bool {
	archivePath := c.getArchivePath(websiteAddress)
	fileLock := c.newFileLock(archivePath)

	err := readLockFile(fileLock)
	if err != nil {
		return false
	}
	defer lockUnlock(fileLock)

	_, err = os.Stat(archivePath)
	if os.IsNotExist(err) {
		return false
	}

	r, err := zip.OpenReader(archivePath)
	if err != nil {
		logger.Errorf("failed to open zip archive %s: %v", archivePath, err)
		return false
	}
	defer closeReader(r)

	for _, f := range r.File {
		if f.Name == resourceName {
			return true
		}
	}

	return false
}

// GetLastModified returns the last modified time of a resource in the cache for a given website
func (c *Cache) GetLastModified(websiteAddress string, fileName string) (time.Time, error) {
	archivePath := c.getArchivePath(websiteAddress)
	fileLock := c.newFileLock(archivePath)

	err := readLockFile(fileLock)
	if err != nil {
		//nolint:wrapcheck
		return time.Time{}, err
	}
	defer lockUnlock(fileLock)

	r, err := zip.OpenReader(archivePath)
	if err != nil {
		return time.Time{}, fmt.Errorf("failed to open zip archive %s: %v", archivePath, err)
	}
	defer closeReader(r)

	for _, f := range r.File {
		if f.Name == fileName {
			return f.Modified, nil
		}
	}

	return time.Time{}, fmt.Errorf("file %s not found in archive %s", fileName, archivePath)
}

// Read returns the content of a resource in the cache for a given website
func (c *Cache) Read(websiteAddress string, resourceName string) ([]byte, error) {
	archivePath := c.getArchivePath(websiteAddress)
	fileLock := c.newFileLock(archivePath)

	err := readLockFile(fileLock)
	if err != nil {
		//nolint:wrapcheck
		return nil, err
	}
	defer lockUnlock(fileLock)

	r, err := zip.OpenReader(archivePath)
	if err != nil {
		return nil, fmt.Errorf("failed to open zip archive %s: %v", archivePath, err)
	}

	defer closeReader(r)

	for _, f := range r.File {
		if f.Name == resourceName {
			rc, err := f.Open()
			if err != nil {
				return nil, fmt.Errorf("failed to open file %s in zip: %v", f.Name, err)
			}
			defer closeReader(rc)

			buf := new(bytes.Buffer)

			_, err = io.Copy(buf, rc)
			if err != nil {
				return nil, fmt.Errorf("failed to copy content of file %s: %v", f.Name, err)
			}

			return buf.Bytes(), nil
		}
	}

	return nil, fmt.Errorf("file %s not found in archive %s", resourceName, archivePath)
}

// Save a resource in the cache for a given website
func (c *Cache) Save(websiteAddress string, resourceName string, content []byte) error {
	archivePath := c.getArchivePath(websiteAddress)
	fileLock := c.newFileLock(archivePath)
	tempArchivePath := archivePath + ".tmp"

	err := writeLockFile(fileLock)
	if err != nil {
		//nolint:wrapcheck
		return err
	}
	defer lockUnlock(fileLock)

	var buf bytes.Buffer
	w := zip.NewWriter(&buf)

	err = c.copyExistingEntries(archivePath, w, resourceName)
	if err != nil {
		return err
	}

	header := &zip.FileHeader{
		Name:     resourceName,
		Method:   zip.Deflate,
		Modified: time.Now(),
	}

	wf, err := w.CreateHeader(header)
	if err != nil {
		return fmt.Errorf("failed to create header for new file %s: %v", resourceName, err)
	}

	_, err = wf.Write(content)
	if err != nil {
		return fmt.Errorf("failed to write content for new file %s: %v", resourceName, err)
	}

	err = w.Close()
	if err != nil {
		return fmt.Errorf("failed to close zip writer: %v", err)
	}

	err = os.WriteFile(tempArchivePath, buf.Bytes(), os.ModePerm)
	if err != nil {
		return fmt.Errorf("failed to write zip archive to temp file %s: %v", tempArchivePath, err)
	}

	err = os.Rename(tempArchivePath, archivePath)
	if err != nil {
		os.Remove(tempArchivePath)
		return fmt.Errorf("failed to replace old zip archive %s with new one %s: %v", archivePath, tempArchivePath, err)
	}

	return nil
}

// Delete a resource in the cache for a given website
func (c *Cache) Delete(websiteAddress string, resourceName string) error {
	archivePath := c.getArchivePath(websiteAddress)
	fileLock := c.newFileLock(archivePath)
	tempArchivePath := archivePath + ".tmp"

	err := writeLockFile(fileLock)
	if err != nil {
		//nolint:wrapcheck
		return err
	}
	defer lockUnlock(fileLock)

	var buf bytes.Buffer
	w := zip.NewWriter(&buf)

	err = c.copyExistingEntries(archivePath, w, resourceName)
	if err != nil {
		return err
	}

	err = w.Close()
	if err != nil {
		return fmt.Errorf("failed to close zip writer: %v", err)
	}

	err = os.WriteFile(tempArchivePath, buf.Bytes(), os.ModePerm)
	if err != nil {
		return fmt.Errorf("failed to write zip archive to temp file %s: %v", tempArchivePath, err)
	}

	err = os.Rename(tempArchivePath, archivePath)
	if err != nil {
		os.Remove(tempArchivePath)
		return fmt.Errorf("failed to replace old zip archive %s with new one %s: %v", archivePath, tempArchivePath, err)
	}

	return nil
}

// copyExistingEntries copies existing ZIP entries to a new ZIP writer, excluding the specified resource
func (c *Cache) copyExistingEntries(archivePath string, w *zip.Writer, excludeResource string) error {
	_, err := os.Stat(archivePath)
	if err != nil && os.IsNotExist(err) {
		return nil
	}

	r, err := zip.OpenReader(archivePath)
	if err != nil {
		return fmt.Errorf("failed to open existing zip archive %s: %v", archivePath, err)
	}
	defer closeReader(r)

	for _, f := range r.File {
		if f.Name == excludeResource {
			continue
		}

		err = copyZipEntry(f, w)
		if err != nil {
			return fmt.Errorf("failed to copy file %s inside zip %s: %v", f.Name, archivePath, err)
		}
	}

	return nil
}

// copyZipEntry copies a zip entry from an existing zip to a new zip writer
func copyZipEntry(f *zip.File, w *zip.Writer) error {
	rc, err := f.Open()
	if err != nil {
		return fmt.Errorf("failed to open file %s in zip: %v", f.Name, err)
	}
	defer closeReader(rc)

	wrc, err := w.CreateHeader(&f.FileHeader)
	if err != nil {
		return fmt.Errorf("failed to create header for file %s: %v", f.Name, err)
	}

	_, err = io.Copy(wrc, rc)
	if err != nil {
		return fmt.Errorf("failed to copy content of file %s: %v", f.Name, err)
	}

	return nil
}

// closeReader closes a reader and logs any errors
func closeReader(r io.Closer) {
	err := r.Close()
	if err != nil {
		logger.Errorf("failed to close reader: %v", err)
	}
}
