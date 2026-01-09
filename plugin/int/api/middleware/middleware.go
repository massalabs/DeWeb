package middleware

import (
	"net/http"
	"slices"
	"strings"

	"github.com/go-openapi/runtime"
	"github.com/massalabs/deweb-plugin/api/restapi/operations"
	"github.com/massalabs/deweb-plugin/int/api/html"
	stationHttp "github.com/massalabs/station/pkg/http"
)

const frontendPrefix = "/web/"

func AllowedDomainsList() []string {
	return []string{"station.massa", "localhost", "127.0.0.1"}
}

func WebAppMiddleware(handler http.Handler) http.Handler {
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

func DomainRestrictionMiddleware(handler http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := stationHttp.GetRequestOrigin(r)
		hostname := stationHttp.ExtractHostname(origin)
		if !slices.Contains(AllowedDomainsList(), hostname) {
			w.WriteHeader(http.StatusForbidden)
			return
		}
		handler.ServeHTTP(w, r)
	})
}
