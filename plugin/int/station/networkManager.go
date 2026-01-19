package station

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/massalabs/deweb-plugin/api/models"
	"github.com/massalabs/deweb-plugin/int/server"
	"github.com/massalabs/deweb-server/int/api/config"
	msConfig "github.com/massalabs/deweb-server/pkg/config"
	"github.com/massalabs/station/pkg/logger"
)

const (
	// StationNetworkEndpoint is the URL for Station's network API
	StationNetworkEndpoint = "http://station.massa/network"

	// PollingInterval is how often to poll Station for network information
	PollingInterval = 3 * time.Second
)

var ErrStationNetworkDown = errors.New("station network fetched from station is down")

// StationNetworkResponse represents the response from Station's network endpoint
type StationNetworkResponse struct {
	CurrentNetwork        string                   `json:"currentNetwork"`
	AvailableNetworkInfos []models.NetworkInfoItem `json:"availableNetworkInfos"`
}

// NetworkManager periodically polls Station for network information
type NetworkManager struct {
	mu            sync.RWMutex
	configManager *server.ServerConfigManager
	serverManager *server.ServerManager
	stopChan      chan struct{}
	httpClient    *http.Client
	isRunning     bool
}

// NewNetworkManager creates a new network manager instance
func NewNetworkManager(configManager *server.ServerConfigManager, serverManager *server.ServerManager) *NetworkManager {
	return &NetworkManager{
		stopChan:      make(chan struct{}),
		configManager: configManager,
		serverManager: serverManager,
		httpClient: &http.Client{
			Timeout: 3 * time.Second,
		},
	}
}

// Start begins polling Station for network information
func (np *NetworkManager) Start() {
	np.mu.Lock()
	if np.isRunning {
		np.mu.Unlock()
		logger.Infof("Network manager already running")
		return
	}
	np.isRunning = true
	np.mu.Unlock()

	logger.Infof("Starting Station network polling (interval: %v)", PollingInterval)

	// Start periodic polling
	go func() {
		ticker := time.NewTicker(PollingInterval)
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				np.pollNetwork()
			case <-np.stopChan:
				logger.Infof("Station network poller stopped")
				return
			}
		}
	}()
}

// Stop stops the network poller
func (np *NetworkManager) Stop() {
	np.mu.Lock()
	defer np.mu.Unlock()

	if !np.isRunning {
		return
	}

	close(np.stopChan)
	np.isRunning = false
}

/*
poll fetches the current network information from Station
If the network used by station has changed, the deweb server is stopped and restarted with the new network url.
*/
func (np *NetworkManager) pollNetwork() {
	// sync the server config with station and restart the server if the network has changed
	if err := np.SyncServerConfNetworkWithStation(true); err != nil {
		logger.Errorf("failed to sync server config with station: %v", err)
		if err == ErrStationNetworkDown {
			np.serverManager.SetLastError(ErrStationNetworkDown.Error())
		}
		return
	}

	// if the last error is that the network retrieved from station is down, reset the last error to ""
	np.serverManager.SetLastErrorIfEqual(ErrStationNetworkDown.Error(), "")
}

/*
Retrieve current network information from station and update the deweb
server config file if the node url is not the same.
If the node name has changed, the node name will be updated in the cache (there is no node name in config).
@param restartServer if true, the server will be restarted with the new network url. Else, only the server config will be updated.
*/
func (np *NetworkManager) SyncServerConfNetworkWithStation(restartServer bool) error {
	response, err := np.fetchStationNetwork()
	if err != nil {
		return err
	}

	if response.Status == "down" {
		return ErrStationNetworkDown
	}

	currentConfig, err := np.configManager.GetServerConfig()
	if err != nil {
		return err
	}

	currentNodeName := np.configManager.GetNodeName()

	// if the network on station has changed, update the server config
	if response.URL != currentConfig.NetworkInfos.NodeURL || response.Name != currentNodeName {
		logger.Infof(
			"Changing massa node configuration from '%s' (%s) to '%s' (%s, the node currently used by station)",
			currentNodeName,
			currentConfig.NetworkInfos.NodeURL,
			response.Name,
			response.URL,
		)
	}

	// update the node name in cache (there is no node name in config)
	if currentNodeName != response.Name {
		np.configManager.UpdateNodeName(response.Name)
	}

	// update the network url in config
	if currentConfig.NetworkInfos.NodeURL != response.URL {
		// if restartServer is true, stop the server
		if restartServer {
			// stop the deweb server
			if err := np.serverManager.Stop(); err != nil && err != server.ErrServerNotRunning {
				return fmt.Errorf("failed to stop server: %w", err)
			}
		}

		// update the server config with the new network url
		if err := np.updateNetworkConfig(currentConfig, response); err != nil {
			return fmt.Errorf("failed to update server config with network from station: %w", err)
		}

		// start the server with the new network url if restartServer is true
		if restartServer {
			// start the server with the new network url
			if err := np.serverManager.Start(); err != nil {
				return fmt.Errorf("failed to start server: %w", err)
			}
		}
	}

	return nil
}

func (np *NetworkManager) updateNetworkConfig(currentConfig *config.ServerConfig, response *models.NetworkInfoItem) error {
	conf := *currentConfig
	conf.NetworkInfos = msConfig.NetworkInfos{
		NodeURL: response.URL,
		Version: response.Version,
		ChainID: uint64(response.ChainID),
	}
	logger.Infof("updating server config with network from station %s", response.URL)
	return np.configManager.SaveServerConfig(&conf)
}

// fetchStationNetwork fetches network information from Station
func (np *NetworkManager) fetchStationNetwork() (*models.NetworkInfoItem, error) {
	resp, err := np.httpClient.Get(StationNetworkEndpoint)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch Station network: %w", err)
	}
	defer func() {
		if cerr := resp.Body.Close(); cerr != nil {
			logger.Errorf("failed to close station network fetch response body: %v", cerr)
		}
	}()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("station API returned status %d", resp.StatusCode)
	}

	var networkResponse StationNetworkResponse
	if err := json.NewDecoder(resp.Body).Decode(&networkResponse); err != nil {
		return nil, fmt.Errorf("failed to decode Station network response: %w", err)
	}

	for _, network := range networkResponse.AvailableNetworkInfos {
		if network.Name == networkResponse.CurrentNetwork {
			return &network, nil
		}
	}

	return nil, fmt.Errorf("current network %s not found in available networks", networkResponse.CurrentNetwork)
}
