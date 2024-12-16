package api

import (
	"net/http"

	"github.com/massalabs/deweb-server/int/zipper"
	"github.com/massalabs/station/pkg/logger"
)

func localHandler(w http.ResponseWriter, zipBytes []byte, resourceName string) {
	if resourceName == "" {
		logger.Debugf("localHandler: No resource specified, using index.html")
		resourceName = "index.html"
	}

	isPresent, err := zipper.VerifyFilePresence(zipBytes, resourceName)
	if err != nil {
		logger.Errorf("localHandler: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
	}

	// If requested resource is not present, it might be the original requested resource.
	// In this case, we try to serve the index.html file of the zip.
	if !isPresent {
		logger.Debugf("localHandler: Resource %s not found in zip, changing to index.html", resourceName)
		resourceName = "index.html"
	}

	content, err := zipper.ReadFileFromZip(zipBytes, resourceName)
	if err != nil {
		logger.Warnf("File not found: %t", zipper.IsNotFoundError(err, resourceName))
		w.WriteHeader(http.StatusNotFound)

		return
	}

	contentType := ContentType(resourceName, content)

	w.Header().Set("Content-Type", contentType)
	w.WriteHeader(http.StatusOK)

	if _, err := w.Write(content); err != nil {
		logger.Errorf("localHandler: %v", err)
	}
}
