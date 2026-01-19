package errors

import "errors"

var (
	ErrNetworkConfig = errors.New("unable to retrieve network config from node")
)
