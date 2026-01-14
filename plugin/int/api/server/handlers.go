package server

import (
	"net/http"

	"github.com/go-openapi/runtime"
	"github.com/go-openapi/runtime/middleware"
	"github.com/massalabs/deweb-plugin/api/models"
	"github.com/massalabs/deweb-plugin/api/restapi/operations"
	"github.com/massalabs/deweb-plugin/int/server"
	"github.com/massalabs/station/pkg/logger"
)

// RegisterHandlers registers the server-related API handlers
func RegisterHandlers(api *operations.DewebPluginAPI, manager *server.ServerManager, configManager *server.ServerConfigManager) {
	api.GetServerStatusHandler = operations.GetServerStatusHandlerFunc(handleGetServerStatus(manager, configManager))
	api.GetSettingsHandler = operations.GetSettingsHandlerFunc(handleGetSettings(configManager))
	api.UpdateSettingsHandler = operations.UpdateSettingsHandlerFunc(handleUpdateSettings(manager, configManager))
}

// handleGetServerStatus returns a handler function for the GET /api/server/status endpoint
func handleGetServerStatus(manager *server.ServerManager, configManager *server.ServerConfigManager) func(operations.GetServerStatusParams) middleware.Responder {
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
			serverConfig, err := configManager.GetServerConfig()
			if err != nil {
				return createErrorResponse(http.StatusInternalServerError, "Failed to get server config")
			}

			response.Network = &models.NetworkInfoItem{
				URL:     serverConfig.NetworkInfos.NodeURL,
				Name:    configManager.GetNodeName(),
				Version: serverConfig.NetworkInfos.Version,
				ChainID: int64(serverConfig.NetworkInfos.ChainID),
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
func handleGetSettings(configManager *server.ServerConfigManager) func(operations.GetSettingsParams) middleware.Responder {
	return func(params operations.GetSettingsParams) middleware.Responder {
		serverConfig, err := configManager.GetServerConfig()
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
func handleUpdateSettings(manager *server.ServerManager, configManager *server.ServerConfigManager) func(operations.UpdateSettingsParams) middleware.Responder {
	return func(params operations.UpdateSettingsParams) middleware.Responder {
		if params.Settings == nil {
			return createErrorResponse(http.StatusBadRequest, "Settings data is required")
		}

		// Load current config
		serverConfig, err := configManager.GetServerConfig()
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

		// Stop the server
		if err := manager.Stop(); err != nil && err != server.ErrServerNotRunning {
			return createErrorResponse(http.StatusInternalServerError, "Failed to stop server")
		}

		// Save the new server config
		// Stopping the server can take a few seconds so use this time to save the new server config.
		if err := configManager.SaveServerConfig(serverConfig); err != nil {
			return createErrorResponse(http.StatusInternalServerError, "Failed to save server configuration")
		}

		// Start the server (it will read the new config on startup)
		go func() {
			if err := manager.Start(); err != nil {
				logger.Errorf("Failed to start server: %v", err)
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
