package main

import (
	"flag"
	"log"

	"github.com/massalabs/deweb-server/int/api"
	"github.com/massalabs/deweb-server/int/api/config"
	"github.com/massalabs/station/pkg/logger"
)

func main() {
	// If the --accept-disclaimer (or -a) flag is set, the disclaimer will not be displayed. This is for CI purposes.
	acceptDisclaimer := flag.Bool("accept-disclaimer", false, "Automatically accept the disclaimer")
	flag.BoolVar(acceptDisclaimer, "a", false, "Shortcut for --accept-disclaimer")
	flag.Parse()

	if !*acceptDisclaimer {
		err := api.HandleDisclaimer()
		if err != nil {
			log.Fatalf("failed to handle disclaimer: %v", err)
		}
	}

	err := logger.InitializeGlobal("./deweb-server.log")
	if err != nil {
		log.Fatalf("failed to initialize logger: %v", err)
	}

	conf, err := config.LoadServerConfig("./deweb_server_config.yaml")
	if err != nil {
		log.Fatalf("failed to load server config: %v", err)
	}

	logger.Debugf("Loaded server config: %+v", conf)

	api := api.NewAPI(conf)
	api.Start()
}
