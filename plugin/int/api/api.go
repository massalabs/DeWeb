package api

import (
	"log"
	"net/http"

	"github.com/go-openapi/loads"
	"github.com/massalabs/deweb-plugin/api/restapi"
	"github.com/massalabs/deweb-plugin/api/restapi/operations"
	"github.com/massalabs/deweb-plugin/int/api/html"
	apiserver "github.com/massalabs/deweb-plugin/int/api/server"
	"github.com/massalabs/deweb-plugin/int/server"
	"github.com/massalabs/station-massa-hello-world/pkg/plugin"
	"github.com/massalabs/station/pkg/logger"
)

type API struct {
	apiServer     *restapi.Server
	pluginAPI     *operations.DewebPluginAPI
	serverManager *server.ServerManager
	configDir     string
}

// NewAPI creates a new API with the provided plugin directory
func NewAPI(configDir string) *API {
	swaggerSpec, err := loads.Analyzed(restapi.SwaggerJSON, "")
	if err != nil {
		log.Fatalln(err)
	}

	dewebAPI := operations.NewDewebPluginAPI(swaggerSpec)
	apiServer := restapi.NewServer(dewebAPI)

	manager, err := server.NewServerManager(configDir)
	if err != nil {
		logger.Errorf("Failed to create server manager: %v", err)
	}

	return &API{
		apiServer:     apiServer,
		pluginAPI:     dewebAPI,
		configDir:     configDir,
		serverManager: manager,
	}
}

// Start starts the API server.
func (a *API) Start() {
	defer func() {
		if err := a.apiServer.Shutdown(); err != nil {
			log.Fatalln(err)
		}

		// Shutdown the server manager if it is running
		if a.serverManager != nil {
			if err := a.serverManager.Stop(); err != nil {
				logger.Errorf("Error stopping server on shutdown: %v", err)
			}
		}
	}()

	// We don't care about the port of the plugin API as MassaStation will handle the port mapping
	a.apiServer.Port = 0

	a.configureAPI()

	a.apiServer.ConfigureAPI()

	a.apiServer.SetHandler(webAppMiddleware(a.pluginAPI.Serve(nil)))

	listener, err := a.apiServer.HTTPListener()
	if err != nil {
		logger.Fatalf("Failed to get HTTP listener: %v", err)
	}

	if err := plugin.RegisterPlugin(listener); err != nil {
		logger.Fatalf("Failed to register plugin: %v", err)
	}

	// Start the server if manager exists
	if a.serverManager != nil {
		go func() {
			if err := a.serverManager.Start(); err != nil && err != server.ErrServerAlreadyRunning {
				logger.Errorf("Failed to start DeWeb server: %v", err)
			}
		}()
	}

	if err := a.apiServer.Serve(); err != nil {
		log.Fatalln(err)
	}
}

// ConfigureAPI sets up the API handlers and error handling.
func (a *API) configureAPI() {
	a.pluginAPI.ServeError = func(w http.ResponseWriter, r *http.Request, err error) {
		log.Printf("ServeError: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
	}

	html.AppendEndpoints(a.pluginAPI)

	if a.serverManager != nil {
		apiserver.RegisterHandlers(a.pluginAPI, a.serverManager, a.configDir)
	} else {
		logger.Errorf("Server manager not available for registering handlers")
	}
}
