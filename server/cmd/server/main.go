package main

import (
	"flag"
	"fmt"
	"log"

	"github.com/massalabs/deweb-server/int/api"
	"github.com/massalabs/deweb-server/int/api/config"
	dewebConfig "github.com/massalabs/deweb-server/int/config"
	"github.com/massalabs/station/pkg/logger"
)

func main() {
	// Add command-line flag for config file path
	configPath := flag.String("configPath", "./deweb_server_config.yaml", "Path to server configuration file")
	logPath := flag.String("logPath", "./deweb-server.log", "Path to server log file")
	// If the --accept-disclaimer (or -a) flag is set, the disclaimer will not be displayed. This is for CI purposes.
	acceptDisclaimer := flag.Bool("accept-disclaimer", false, "Automatically accept the disclaimer")
	flag.BoolVar(acceptDisclaimer, "a", false, "Shortcut for --accept-disclaimer")

	// Add version flag
	showVersion := flag.Bool("version", false, "Show version information")
	flag.Parse()

	// Handle version flag
	if *showVersion {
		fmt.Println(dewebConfig.Version)
		return
	}

	err := logger.InitializeGlobal(*logPath)
	if err != nil {
		log.Fatalf("failed to initialize logger: %v", err)
	}

	if !*acceptDisclaimer {
		err := api.HandleDisclaimer()
		if err != nil {
			log.Fatalf("failed to handle disclaimer: %v", err)
		}
	}

	conf, err := config.LoadServerConfig(*configPath)
	if err != nil {
		log.Fatalf("failed to load server config: %v", err)
	}

	logger.Debugf("Loaded server config: %+v", conf)

	api := api.NewAPI(conf)
	api.Start()
}
