package server

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sync"
	"syscall"
	"time"

	"github.com/massalabs/deweb-server/int/api/config"
	"github.com/massalabs/station/pkg/logger"
	"github.com/shirou/gopsutil/v4/process"
)

const (
	DefaultLogPath = "deweb-server.log"
)

// ServerManager handles DeWeb server operations with thread safety
type ServerManager struct {
	mu            sync.Mutex
	serverProcess *os.Process
	serverBinPath string
	configDir     string
	isRunning     bool
	lastError     string
	binaryExists  bool
}

// NewServerManager creates a new server manager
func NewServerManager(configDir string) (*ServerManager, error) {
	// Ensure config directory exists
	if err := os.MkdirAll(configDir, 0o755); err != nil {
		return nil, fmt.Errorf("failed to create config directory: %v", err)
	}

	// Determine the plugin's executable path
	execPath, err := os.Executable()
	if err != nil {
		return nil, fmt.Errorf("failed to get executable path: %v", err)
	}

	// Server binary should be in the same directory as the plugin
	pluginDir := filepath.Dir(execPath)
	serverBinPath := filepath.Join(pluginDir, "deweb-server")

	// On Windows, add .exe extension
	if filepath.Ext(execPath) == ".exe" {
		serverBinPath += ".exe"
	}

	manager := &ServerManager{
		serverBinPath: serverBinPath,
		configDir:     configDir,
		binaryExists:  true,
	}

	// Check if config file exists, if not, create it with defaults
	if err := ensureConfigFileExists(configDir); err != nil {
		manager.lastError = fmt.Sprintf("Failed to ensure config file exists: %v", err)
		logger.Errorf(manager.lastError)
	}

	return manager, nil
}

// Start launches the server process
func (m *ServerManager) Start() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Check if binary exists
	if _, err := os.Stat(m.serverBinPath); os.IsNotExist(err) {
		m.binaryExists = false
		m.lastError = fmt.Sprintf("Server binary not found at %s", m.serverBinPath)
		return fmt.Errorf(m.lastError)
	}

	if m.isRunning {
		logger.Infof("Server is already running")
		return ErrServerAlreadyRunning
	}

	configPath := m.GetConfigPath()
	logger.Infof("Starting DeWeb server with config: %s", configPath)

	logPath := filepath.Join(m.configDir, DefaultLogPath)

	cmd := exec.Command(m.serverBinPath, "--configPath", configPath, "--logPath", logPath, "--accept-disclaimer")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Start(); err != nil {
		m.lastError = fmt.Sprintf("Failed to start server: %v", err)
		logger.Errorf(m.lastError)
		return err
	}

	m.serverProcess = cmd.Process
	m.isRunning = true
	m.lastError = ""

	// Start a goroutine to monitor the process
	go func() {
		err := cmd.Wait()
		if err != nil {
			m.mu.Lock()
			m.lastError = fmt.Sprintf("Server process exited with error: %v", err)
			m.mu.Unlock()
			logger.Errorf(m.lastError)
		}

		m.mu.Lock()
		m.isRunning = false
		m.serverProcess = nil
		m.mu.Unlock()

		logger.Infof("Server process exited")
	}()

	return nil
}

// Stop terminates the server process
func (m *ServerManager) Stop() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if !m.isRunning || m.serverProcess == nil {
		logger.Infof("Server is not running")
		return ErrServerNotRunning
	}

	logger.Infof("Stopping DeWeb server")

	// Send a SIGTERM signal to gracefully shut down
	if err := m.serverProcess.Signal(syscall.SIGTERM); err != nil {
		logger.Errorf("Failed to send SIGTERM: %v", err)

		// Force kill as a fallback
		if err = m.serverProcess.Kill(); err != nil {
			return err
		}
	}

	// Wait for the process to exit
	timeout := time.Now().Add(5 * time.Second)
	for time.Now().Before(timeout) && m.isRunning {
		time.Sleep(100 * time.Millisecond)
	}

	// If still running after timeout, force kill
	if m.isRunning {
		_ = m.serverProcess.Kill()
		m.isRunning = false
		m.serverProcess = nil
	}

	logger.Infof("Server stopped")

	return nil
}

// Restart restarts the server
func (m *ServerManager) Restart() error {
	if err := m.Stop(); err != nil && err != ErrServerNotRunning {
		return err
	}

	return m.Start()
}

// GetStatus returns the current server status
func (m *ServerManager) GetStatus() Status {
	m.mu.Lock()
	defer m.mu.Unlock()

	if !m.binaryExists || m.lastError != "" {
		return StatusError
	}

	if m.isRunning {
		return StatusRunning
	}
	return StatusStopped
}

// IsRunning returns whether the server is currently running
func (m *ServerManager) IsRunning() bool {
	m.mu.Lock()
	defer m.mu.Unlock()

	return m.isRunning
}

func (m *ServerManager) GetConfigPath() string {
	return getConfigPath(m.configDir)
}

func (m *ServerManager) GetConfig() (*config.ServerConfig, error) {
	return loadConfig(m.GetConfigPath())
}

// GetLastError returns the last error message
func (m *ServerManager) GetLastError() string {
	m.mu.Lock()
	defer m.mu.Unlock()

	return m.lastError
}

// GetServerPort retrieves the actual port the server is running on
func (m *ServerManager) GetServerPort() (uint32, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if !m.isRunning || m.serverProcess == nil {
		return 0, ErrServerNotRunning
	}

	proc, err := process.NewProcess(int32(m.serverProcess.Pid))
	if err != nil {
		return 0, fmt.Errorf("failed to access process: %v", err)
	}

	connections, err := proc.Connections()
	if err != nil {
		return 0, fmt.Errorf("failed to get process connections: %v", err)
	}

	// Find TCP connections in LISTEN state
	for _, conn := range connections {
		if conn.Status == "LISTEN" {
			return conn.Laddr.Port, nil
		}
	}

	return 0, fmt.Errorf("no listening ports found for server process")
}
