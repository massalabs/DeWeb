package api

import (
	"fmt"
	"net/http"

	"github.com/go-openapi/runtime"
	"github.com/go-openapi/runtime/middleware"
	"github.com/massalabs/DeWeb/api/read/restapi/operations"
	"github.com/massalabs/station/pkg/logger"
)

// As websites are catched by the subdomain middleware, this handler is only called for the landing page resources.
func getResourceHandler(params operations.GetResourceParams) middleware.Responder {
	return middleware.ResponderFunc(func(w http.ResponseWriter, _ runtime.Producer) {
		logger.Debugf("GetResourceHandler")
		logger.Debugf("GetResourceHandler: %s", params.Resource)

		// Return a simple index.html for the root path with "Hello from DeWeb" message.
		if params.Resource == "index.html" {
			w.Header().Set("Content-Type", "text/html")
			w.WriteHeader(http.StatusOK)
			fmt.Fprint(w, "<html><body><h1>Hello from DeWeb</h1></body></html>")
		} else {
			logger.Warnf("GetResourceHandler: Not implemented for resource %s", params.Resource)
			w.WriteHeader(http.StatusNotFound)
		}
	})
}

// Redirects the user to the index.html page.
func defaultPageHandler(params operations.DefaultPageParams) middleware.Responder {
	return middleware.ResponderFunc(func(w http.ResponseWriter, _ runtime.Producer) {
		logger.Debug("DefaultPageHandler: Redirecting to index.html")
		http.Redirect(w, params.HTTPRequest, "/index.html", http.StatusFound)
	})
}
