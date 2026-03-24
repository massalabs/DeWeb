//go:build !windows

package server

import (
	"os"
	"os/exec"
	"syscall"

	"github.com/massalabs/station/pkg/logger"
)

func setProcessAttributes(_ *exec.Cmd) {}

func signalTermination(process *os.Process, killCallback func() error) error {
	if err := process.Signal(syscall.SIGTERM); err != nil {
		logger.Errorf("Failed to send SIGTERM: %v", err)

		// Force kill as a fallback
		return killCallback()
	}

	return nil
}
