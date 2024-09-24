package cache

import (
	"context"
	"fmt"
	"time"

	"github.com/gofrs/flock"
	"github.com/massalabs/station/pkg/logger"
)

// writeLockFile tries to acquire a write lock on a file
func writeLockFile(fileLock *flock.Flock) error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	locked, err := fileLock.TryLockContext(ctx, 50*time.Millisecond)
	if err != nil {
		return fmt.Errorf("failed to acquire file lock on %s: %v", fileLock.Path(), err)
	}

	if !locked {
		return fmt.Errorf("timed out trying to acquire file lock on %s", fileLock.Path())
	}

	return nil
}

// readLockFile tries to acquire a read lock on a file
func readLockFile(fileLock *flock.Flock) error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	locked, err := fileLock.TryRLockContext(ctx, 50*time.Millisecond)
	if err != nil {
		return fmt.Errorf("failed to acquire file lock on %s: %v", fileLock.Path(), err)
	}

	if !locked {
		return fmt.Errorf("timed out trying to acquire file lock on %s", fileLock.Path())
	}

	return nil
}

// lockUnlock unlocks a file lock
func lockUnlock(fileLock *flock.Flock) {
	err := fileLock.Unlock()
	if err != nil {
		logger.Errorf("failed to unlock file %s: %v", fileLock.Path(), err)
	}
}
