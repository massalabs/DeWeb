package server

import (
	"net/http"
	"os"
	"path/filepath"

	"github.com/go-openapi/runtime"
	"github.com/go-openapi/runtime/middleware"
	"github.com/massalabs/deweb-plugin/api/models"
	"github.com/massalabs/deweb-plugin/api/restapi/operations"
	"github.com/massalabs/deweb-plugin/int/server"
	"github.com/massalabs/deweb-server/int/api/config"
	"github.com/massalabs/station/pkg/logger"
	"gopkg.in/yaml.v2"
)

// RegisterHandlers registers the server-related API handlers
func RegisterHandlers(api *operations.DewebPluginAPI, manager *server.ServerManager, configDir string) {
	configPath := filepath.Join(configDir, "deweb_server_config.yaml")

	api.GetServerStatusHandler = operations.GetServerStatusHandlerFunc(handleGetServerStatus(manager))
	api.GetSettingsHandler = operations.GetSettingsHandlerFunc(handleGetSettings(configPath))
	api.UpdateSettingsHandler = operations.UpdateSettingsHandlerFunc(handleUpdateSettings(manager, configPath))
}

// handleGetServerStatus returns a handler function for the GET /api/server/status endpoint
func handleGetServerStatus(manager *server.ServerManager) func(operations.GetServerStatusParams) middleware.Responder {
	return func(params operations.GetServerStatusParams) middleware.Responder {
		status := manager.GetStatus()

		response := &models.ServerStatus{
			Status: string(status),
		}

		if status == server.StatusError {
			errorMsg := manager.GetLastError()
			response.ErrorMessage = errorMsg
		}

		if status == server.StatusRunning {
			serverConfig, err := manager.GetConfig()
			if err != nil {
				return createErrorResponse(http.StatusInternalServerError, "Failed to get server config")
			}

			response.Network = &models.ServerStatusNetwork{
				ChainID: serverConfig.NetworkInfos.ChainID,
				Network: serverConfig.NetworkInfos.Network,
				Version: serverConfig.NetworkInfos.Version,
			}

			apiPort, err := manager.GetServerPort()
			if err != nil {
				return createErrorResponse(http.StatusInternalServerError, "Failed to get server port")
			}

			response.ServerPort = int32(apiPort)
		}

		return operations.NewGetServerStatusOK().WithPayload(response)
	}
}

// handleGetSettings returns a handler function for the GET /api/settings endpoint
func handleGetSettings(configPath string) func(operations.GetSettingsParams) middleware.Responder {
	return func(params operations.GetSettingsParams) middleware.Responder {
		serverConfig, err := config.LoadServerConfig(configPath)
		if err != nil {
			return createErrorResponse(http.StatusInternalServerError, "Failed to load server configuration")
		}

		// Map server config to API model
		networkURL := serverConfig.NetworkInfos.NodeURL
		enabled := serverConfig.CacheConfig.Enabled
		diskCacheDir := serverConfig.CacheConfig.DiskCacheDir

		cacheSettings := &models.CacheSettings{
			Enabled:                      &enabled,
			SiteRAMCacheMaxItems:         int32(serverConfig.CacheConfig.SiteRAMCacheMaxItems),
			SiteDiskCacheMaxItems:        int32(serverConfig.CacheConfig.SiteDiskCacheMaxItems),
			DiskCacheDir:                 diskCacheDir,
			FileListCacheDurationSeconds: int32(serverConfig.CacheConfig.FileListCacheDurationSeconds),
		}

		return operations.NewGetSettingsOK().WithPayload(&models.Settings{
			NetworkURL: &networkURL,
			ServerPort: int32(serverConfig.APIPort),
			Cache:      cacheSettings,
		})
	}
}

// handleUpdateSettings returns a handler function for the PUT /api/settings endpoint
func handleUpdateSettings(manager *server.ServerManager, configPath string) func(operations.UpdateSettingsParams) middleware.Responder {
	return func(params operations.UpdateSettingsParams) middleware.Responder {
		if params.Settings == nil {
			return createErrorResponse(http.StatusBadRequest, "Settings data is required")
		}

		// Load current config
		serverConfig, err := config.LoadServerConfig(configPath)
		if err != nil {
			return createErrorResponse(http.StatusInternalServerError, "Failed to load server configuration")
		}

		// Update config with new settings
		settings := params.Settings
		if settings.NetworkURL != nil {
			serverConfig.NetworkInfos.NodeURL = *settings.NetworkURL
		}

		if settings.ServerPort != 0 {
			serverConfig.APIPort = int(settings.ServerPort)
		}

		if settings.Cache != nil {
			if settings.Cache.Enabled != nil {
				serverConfig.CacheConfig.Enabled = *settings.Cache.Enabled
			}

			if settings.Cache.SiteRAMCacheMaxItems != 0 {
				serverConfig.CacheConfig.SiteRAMCacheMaxItems = uint64(settings.Cache.SiteRAMCacheMaxItems)
			}

			if settings.Cache.SiteDiskCacheMaxItems != 0 {
				serverConfig.CacheConfig.SiteDiskCacheMaxItems = uint64(settings.Cache.SiteDiskCacheMaxItems)
			}

			if settings.Cache.DiskCacheDir != "" {
				serverConfig.CacheConfig.DiskCacheDir = settings.Cache.DiskCacheDir
			}

			if settings.Cache.FileListCacheDurationSeconds != 0 {
				serverConfig.CacheConfig.FileListCacheDurationSeconds = int(settings.Cache.FileListCacheDurationSeconds)
			}
		}

		// Marshal config to YAML
		yamlData, err := yaml.Marshal(serverConfig)
		if err != nil {
			return createErrorResponse(http.StatusInternalServerError, "Failed to marshal configuration")
		}

		// Stop the server
		if err := manager.Stop(); err != nil && err != server.ErrServerNotRunning {
			return createErrorResponse(http.StatusInternalServerError, "Failed to stop server")
		}

		// Write config file
		if err := os.WriteFile(configPath, yamlData, 0o644); err != nil {
			return createErrorResponse(http.StatusInternalServerError, "Failed to write configuration file")
		}

		// Restart the server
		go func() {
			if err := manager.Start(); err != nil {
				logger.Errorf("Failed to restart server: %v", err)
			}
		}()

		return operations.NewUpdateSettingsOK()
	}
}

// Create an error response with the given status code and message
func createErrorResponse(statusCode int, message string) middleware.Responder {
	code := int32(statusCode)
	return &customErrorResponder{
		statusCode: statusCode,
		payload: &models.Error{
			Code:    &code,
			Message: &message,
		},
	}
}

// customErrorResponder implements the Responder interface for error responses
type customErrorResponder struct {
	statusCode int
	payload    *models.Error
}

// WriteResponse writes the error response
func (r *customErrorResponder) WriteResponse(rw http.ResponseWriter, producer runtime.Producer) {
	rw.WriteHeader(r.statusCode)
	if err := producer.Produce(rw, r.payload); err != nil {
		panic(err)
	}
}
