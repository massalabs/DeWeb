//go:build windows

package server

import (
	"os"
	"os/exec"
	"syscall"
)

func setProcessAttributes(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{
		CreationFlags: syscall.CREATE_NEW_PROCESS_GROUP,
	}
}

func signalTermination(_ *os.Process, killCallback func() error) error {
	// Windows does not support POSIX SIGTERM for arbitrary processes.
	// Caller will fallback to force kill.
	return killCallback()
}
