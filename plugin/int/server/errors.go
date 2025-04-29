package server

var (
	ErrServerNotRunning     = NewError("server is not running")
	ErrServerAlreadyRunning = NewError("server is already running")
)

// Error represents a server manager error
type Error struct {
	message string
}

// NewError creates a new Error
func NewError(msg string) *Error {
	return &Error{message: msg}
}

// Error returns the error message
func (e *Error) Error() string {
	return e.message
}
