package server

// Status represents the current status of the server
type Status string

// Server status constants
const (
	StatusRunning  Status = "running"
	StatusStopped  Status = "stopped"
	StatusStarting Status = "starting"
	StatusStopping Status = "stopping"
	StatusError    Status = "error"
)
