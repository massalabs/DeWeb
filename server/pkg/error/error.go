package error

const (
	ErrNetworkConfigCode = 1000
)

type ServerError struct {
	Message   string
	ErrorCode int
}

func NewServerError(message string, errorCode int) *ServerError {
	return &ServerError{Message: message, ErrorCode: errorCode}
}

func (e *ServerError) Error() string {
	return e.Message
}
