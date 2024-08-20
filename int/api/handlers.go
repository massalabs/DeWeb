package api

import (
	_ "embed"
	"net/http"

	"github.com/go-openapi/runtime"
	"github.com/go-openapi/runtime/middleware"
	"github.com/massalabs/DeWeb/api/read/restapi/operations"
	"github.com/massalabs/station/pkg/logger"
)

//go:embed resources/home.zip
var homeZip []byte

// As websites are catched by the subdomain middleware, this handler is only called for the landing page resources.
func getResourceHandler(params operations.GetResourceParams) middleware.Responder {
	return middleware.ResponderFunc(func(w http.ResponseWriter, _ runtime.Producer) {
		localHandler(w, homeZip, params.Resource)
	})
}

// Redirects the user to the index.html page.
func defaultPageHandler(params operations.DefaultPageParams) middleware.Responder {
	return middleware.ResponderFunc(func(w http.ResponseWriter, _ runtime.Producer) {
		logger.Debug("DefaultPageHandler: Redirecting to index.html")
		http.Redirect(w, params.HTTPRequest, "/index.html", http.StatusFound)
	})
}
