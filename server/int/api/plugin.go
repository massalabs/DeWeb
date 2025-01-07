package api

import (
	"log"
	"net/http"

	"github.com/go-openapi/loads"
	"github.com/massalabs/deweb-server/api/read/restapi"
	"github.com/massalabs/deweb-server/api/read/restapi/operations"
	"github.com/massalabs/deweb-server/int/api/config"
	"github.com/massalabs/station-massa-hello-world/pkg/plugin"
	"github.com/massalabs/station/pkg/logger"
)

type PluginAPI struct {
	conf      *config.ServerConfig
	apiServer *restapi.Server
	dewebAPI  *operations.DeWebAPI
}

func NewPluginAPI(conf *config.ServerConfig) *PluginAPI {
	swaggerSpec, err := loads.Analyzed(restapi.SwaggerJSON, "")
	if err != nil {
		log.Fatalln(err)
	}

	dewebAPI := operations.NewDeWebAPI(swaggerSpec)
	server := restapi.NewServer(dewebAPI)

	return &PluginAPI{
		conf:      conf,
		apiServer: server,
		dewebAPI:  dewebAPI,
	}
}

// Start starts the API server.
func (a *PluginAPI) Start() {
	defer func() {
		if err := a.apiServer.Shutdown(); err != nil {
			log.Fatalln(err)
		}
	}()

	a.apiServer.Port = a.conf.APIPort

	a.configurePluginAPI()

	a.apiServer.ConfigureAPI()

	a.apiServer.SetHandler(StationMiddleware(SubdomainMiddleware(a.dewebAPI.Serve(nil), a.conf)))

	listener, err := a.apiServer.HTTPListener()
	if err != nil {
		logger.Fatalf("Failed to get HTTP listener: %v", err)
	}

	if err := plugin.RegisterPlugin(listener); err != nil {
		logger.Fatalf("Failed to register plugin: %v", err)
	}

	if err := a.apiServer.Serve(); err != nil {
		log.Fatalln(err)
	}
}

// ConfigureAPI sets up the API handlers and error handling.
func (a *PluginAPI) configurePluginAPI() {
	a.dewebAPI.ServeError = func(w http.ResponseWriter, r *http.Request, err error) {
		log.Printf("ServeError: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
	}

	a.dewebAPI.GetResourceHandler = operations.GetResourceHandlerFunc(getResourceHandler)
	a.dewebAPI.DefaultPageHandler = operations.DefaultPageHandlerFunc(defaultPageHandler)
}

// StationMiddleware handles station website serving.
// It is used by the plugin to serve massastation plugin page if the request domain is `station.massa`.
func StationMiddleware(handler http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		logger.Debugf("StationMiddleware: Handling request for %s", r.Host)

		if r.Host != "station.massa" {
			logger.Debug("StationMiddleware: Request is not for station.massa. Proceeding with the next handler.")
			handler.ServeHTTP(w, r)

			return
		}

		path := cleanPath(r.URL.Path)

		logger.Debugf("StationMiddleware: Serving station.massa plugin page")

		localHandler(w, homeZip, path)
	})
}
