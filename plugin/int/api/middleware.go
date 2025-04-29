package api

import (
	"net/http"
	"strings"

	"github.com/go-openapi/runtime"
	"github.com/massalabs/deweb-plugin/api/restapi/operations"
	"github.com/massalabs/deweb-plugin/int/api/html"
)

const frontendPrefix = "/web/"

func webAppMiddleware(handler http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, frontendPrefix) {
			params := operations.PluginWebAppParams{
				HTTPRequest: r,
				Resource:    strings.TrimPrefix(r.URL.Path, frontendPrefix),
			}
			responder := html.HandleWebApp(params)
			responder.WriteResponse(w, runtime.JSONProducer())

			return
		}

		handler.ServeHTTP(w, r)
	})
}
