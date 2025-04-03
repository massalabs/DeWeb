package api

import (
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"

	"github.com/go-openapi/runtime"
	"github.com/go-openapi/runtime/middleware"
	"github.com/massalabs/deweb-server/api/read/restapi/operations"
	"github.com/massalabs/deweb-server/int/api/config"
	"github.com/massalabs/station-massa-hello-world/pkg/plugin"
	"github.com/massalabs/station/pkg/logger"
)

type PluginAPI struct {
	*API
	homeZip []byte
}

func NewPluginAPI(conf *config.ServerConfig, homeZip []byte) *PluginAPI {
	baseAPI := NewAPI(conf)

	return &PluginAPI{
		API:     baseAPI,
		homeZip: homeZip,
	}
}

// createHandler overrides the base API's createHandler to add StationMiddleware
func (a *PluginAPI) createHandler() http.Handler {
	baseHandler := a.API.createHandler()
	return StationMiddleware(baseHandler, a.homeZip, a.Conf)
}

// Start starts the API server.
func (a *PluginAPI) Start() {
	defer func() {
		if a.Cache != nil {
			a.Cache.Close()
		}

		if err := a.APIServer.Shutdown(); err != nil {
			log.Fatalln(err)
		}
	}()

	a.APIServer.Port = a.Conf.APIPort

	a.configurePluginAPI()

	a.APIServer.ConfigureAPI()

	// Set handler using the createHandler method
	a.APIServer.SetHandler(a.createHandler())

	listener, err := a.APIServer.HTTPListener()
	if err != nil {
		logger.Fatalf("Failed to get HTTP listener: %v", err)
	}

	// We get the port from the listener in case the port was set to 0 and the OS assigned a port
	a.Conf.APIPort = listener.Addr().(*net.TCPAddr).Port

	if err := plugin.RegisterPlugin(listener); err != nil {
		logger.Fatalf("Failed to register plugin: %v", err)
	}

	if err := a.APIServer.Serve(); err != nil {
		log.Fatalln(err)
	}
}

// ConfigureAPI sets up the API handlers and error handling.
func (a *PluginAPI) configurePluginAPI() {
	a.DewebAPI.ServeError = func(w http.ResponseWriter, r *http.Request, err error) {
		log.Printf("ServeError: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
	}

	a.DewebAPI.GetResourceHandler = operations.GetResourceHandlerFunc(getPluginResourceHandler)
	a.DewebAPI.DefaultPageHandler = operations.DefaultPageHandlerFunc(getPluginDefaultPageHandler)
}

// StationMiddleware handles station website serving.
// It is used by the plugin to serve massastation plugin page if the request domain is `station.massa`.
func StationMiddleware(handler http.Handler, homePageZip []byte, conf *config.ServerConfig) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		logger.Debugf("StationMiddleware: Handling request for %s", r.Host)

		if r.Host != "station.massa" {
			logger.Debug("StationMiddleware: Request is not for station.massa. Proceeding with the next handler.")
			handler.ServeHTTP(w, r)

			return
		}

		path := cleanPath(r.URL.Path)

		if path == "port" {
			w.WriteHeader(http.StatusOK)

			_, err := w.Write([]byte(fmt.Sprintf("%d", conf.APIPort)))
			if err != nil {
				logger.Errorf("Failed to write port: %v", err)
			}

			return
		}

		if path == "info" {
			w.WriteHeader(http.StatusOK)

			json, err := json.Marshal(conf.NetworkInfos)
			if err != nil {
				logger.Errorf("Failed to marshal network infos: %v", err)
			}

			_, err = w.Write(json)
			if err != nil {
				logger.Errorf("Failed to write info: %v", err)
			}

			return
		}

		logger.Debugf("StationMiddleware: Serving station.massa plugin page")

		localHandler(w, homePageZip, path)
	})
}

func getPluginResourceHandler(params operations.GetResourceParams) middleware.Responder {
	return middleware.ResponderFunc(func(w http.ResponseWriter, _ runtime.Producer) {
		logger.Debugf("getPluginResourceHandler: redirecting to plugin")

		http.Redirect(w, params.HTTPRequest, "https://station.massa/plugin/massa-labs/deweb-plugin", http.StatusSeeOther)
	})
}

func getPluginDefaultPageHandler(params operations.DefaultPageParams) middleware.Responder {
	return middleware.ResponderFunc(func(w http.ResponseWriter, _ runtime.Producer) {
		logger.Debugf("getPluginDefaultPageHandler: redirecting to plugin")

		http.Redirect(w, params.HTTPRequest, "https://station.massa/plugin/massa-labs/deweb-plugin", http.StatusSeeOther)
	})
}
