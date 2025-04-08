package api

import (
	"mime"
	"net/http"
	"path/filepath"

	"github.com/massalabs/deweb-server/pkg/cache"
	mnscache "github.com/massalabs/deweb-server/pkg/mns/cache"
	"github.com/massalabs/station/pkg/logger"
)

// ContentType returns the content type of the given file.
// It uses mime.TypeByExtension to determine the content type, if it fails,
// it uses http.DetectContentType to determine the content type, which is heavier to run.
// If http.DetectContentType fails, it returns "application/octet-stream".
func ContentType(filename string, bytes []byte) string {
	ctype := mime.TypeByExtension(filepath.Ext(filename))
	if ctype == "" {
		ctype = http.DetectContentType(bytes)
	}

	return ctype
}

// GetCacheFromContext retrieves the cache instance from the request context
func GetCacheFromContext(r *http.Request) *cache.Cache {
	if cache, ok := r.Context().Value(cacheKey).(*cache.Cache); ok {
		logger.Debugf("GetCacheFromContext: Cache found in context")
		return cache
	}

	logger.Debugf("GetCacheFromContext: No cache found in context")

	return nil
}

// GetMNSCacheFromContext retrieves the mns cache instance from the request context
func GetMNSCacheFromContext(r *http.Request) *mnscache.MNSCache {
	if cache, ok := r.Context().Value(mnsCacheKey).(*mnscache.MNSCache); ok {
		logger.Debugf("GetMNSCacheFromContext: MNSCache found in context")
		return cache
	}

	logger.Debugf("GetMNSCacheFromContext: No MNSCache found in context")

	return nil
}
