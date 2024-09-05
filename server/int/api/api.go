package api

import (
	"log"
	"net/http"

	"github.com/go-openapi/loads"
	"github.com/massalabs/deweb-server/api/read/restapi"
	"github.com/massalabs/deweb-server/api/read/restapi/operations"
	"github.com/massalabs/deweb-server/int/api/config"
)

type API struct {
	conf      *config.ServerConfig
	apiServer *restapi.Server
	dewebAPI  *operations.DeWebAPI
}

func NewAPI(conf *config.ServerConfig) *API {
	swaggerSpec, err := loads.Analyzed(restapi.SwaggerJSON, "")
	if err != nil {
		log.Fatalln(err)
	}

	dewebAPI := operations.NewDeWebAPI(swaggerSpec)
	server := restapi.NewServer(dewebAPI)

	return &API{
		conf:      conf,
		apiServer: server,
		dewebAPI:  dewebAPI,
	}
}

// Start starts the API server.
func (a *API) Start() {
	defer func() {
		if err := a.apiServer.Shutdown(); err != nil {
			log.Fatalln(err)
		}
	}()

	a.apiServer.Port = a.conf.APIPort

	a.configureAPI()

	a.apiServer.ConfigureAPI()

	a.apiServer.SetHandler(SubdomainMiddleware(a.dewebAPI.Serve(nil), a.conf))

	if err := a.apiServer.Serve(); err != nil {
		log.Fatalln(err)
	}
}

// ConfigureAPI sets up the API handlers and error handling.
func (a *API) configureAPI() {
	a.dewebAPI.ServeError = func(w http.ResponseWriter, r *http.Request, err error) {
		log.Printf("ServeError: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
	}

	a.dewebAPI.GetResourceHandler = operations.GetResourceHandlerFunc(getResourceHandler)
	a.dewebAPI.DefaultPageHandler = operations.DefaultPageHandlerFunc(defaultPageHandler)
}
