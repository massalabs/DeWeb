package api

import (
	"mime"
	"net/http"
	"path/filepath"
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
