package main

import (
	"log"

	"github.com/massalabs/deweb-server/int/api"
	"github.com/massalabs/deweb-server/int/api/config"
	"github.com/massalabs/station/pkg/logger"
)

func main() {
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
