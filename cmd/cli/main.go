package main

import (
	"fmt"
	"log"
	"os"
	"time"

	yamlConfig "github.com/massalabs/DeWeb/int/cli"
	"github.com/massalabs/DeWeb/int/config"
	"github.com/massalabs/DeWeb/int/utils"
	"github.com/massalabs/DeWeb/int/zipper"
	pkgConfig "github.com/massalabs/DeWeb/pkg/config"
	"github.com/massalabs/DeWeb/pkg/website"
	msConfig "github.com/massalabs/station/int/config"
	"github.com/massalabs/station/pkg/logger"
	"github.com/massalabs/station/pkg/node"
	"github.com/urfave/cli/v2"
)

const defaultYamlConfigPath = "./deweb_cli_config.yaml"

func main() {
	var nickname string

	var nodeURL string

	var configPath string

	flags := []cli.Flag{
		&cli.StringFlag{
			Name:        "wallet_nickname",
			Usage:       "selected wallet `wallet_nickname`",
			Aliases:     []string{"w"},
			Destination: &nickname,
		},
		&cli.StringFlag{
			Name:        "node_url",
			Usage:       "selected wallet `node_url`",
			Aliases:     []string{"n"},
			Destination: &nodeURL,
		},
		&cli.StringFlag{
			Name:        "config",
			Aliases:     []string{"c"},
			Usage:       "Load configuration from `file_path`",
			Value:       defaultYamlConfigPath,
			DefaultText: defaultYamlConfigPath,
			Destination: &configPath,
		},
	}

	app := &cli.App{
		Name:      "DeWeb CLI",
		Usage:     "CLI app for deploying websites",
		UsageText: "Upload, delete & edit DeWeb site from the terminal",
		Version:   config.Version,
		Flags:     flags,
		Action: func(cCtx *cli.Context) error {
			err := cli.ShowAppHelp(cCtx)
			if err != nil {
				return fmt.Errorf("failed to show app help: %v", err)
			}
			return nil
		},

		Commands: []*cli.Command{
			{
				Name:      "upload",
				Aliases:   []string{"u"},
				Usage:     "Upload a website",
				ArgsUsage: "<website_zip_file_path>",
				Flags:     flags,
				Action: func(cCtx *cli.Context) error {
					if cCtx.Args().Len() < 1 {
						return fmt.Errorf("invalid number of arguments\nUsage: %s %s", cCtx.App.Name, cCtx.Command.ArgsUsage)
					}

					config, err := yamlConfig.LoadConfig(configPath, nodeURL, nickname)
					if err != nil {
						return fmt.Errorf("failed to load yaml config: %v", err)
					}

					filepath := cCtx.Args().Get(0)
					if !zipper.IsValidZipFile(filepath) {
						return fmt.Errorf("invalid zip file: %s", filepath)
					}

					siteAddress, err := deployWebsite(config, filepath)
					if err != nil {
						logger.Fatalf("failed to deploy website: %v", err)
					}

					logger.Infof("successfully uploaded a website at %s", siteAddress)

					return nil
				},
			},
			{
				Name:      "edit",
				Aliases:   []string{"e"},
				Usage:     "Edit website",
				ArgsUsage: "<website_sc_address> <website_zip_file_path>",
				Flags:     flags,
				Action: func(cCtx *cli.Context) error {
					if cCtx.Args().Len() < 2 {
						return fmt.Errorf("invalid number of arguments\nUsage: %s %s", cCtx.App.Name, cCtx.Command.ArgsUsage)
					}

					config, err := yamlConfig.LoadConfig(configPath, nodeURL, nickname)
					if err != nil {
						return fmt.Errorf("failed to load yaml config: %v", err)
					}

					siteAddress := cCtx.Args().Get(0)
					filepath := cCtx.Args().Get(1)

					if !zipper.IsValidZipFile(filepath) {
						return fmt.Errorf("invalid zip file: %s", filepath)
					}

					bytecode, err := processFileForUpload(filepath)
					if err != nil {
						logger.Fatalf("failed to process file for upload: %v", err)
					}

					err = deleteIfRequired(config, siteAddress, len(bytecode))
					if err != nil {
						logger.Errorf("failed to check if delete is required: %v", err)
						logger.Warnf("continuing with edit operation for website %s", siteAddress)
					}

					err = uploadChunks(bytecode, siteAddress, config)
					if err != nil {
						logger.Fatalf("failed to upload chunks: %v", err)
					}

					logger.Infof("%s was succesfully updated", siteAddress)

					return nil
				},
			},
			{
				Name:      "view",
				Aliases:   []string{"v"},
				Usage:     "View  html content",
				ArgsUsage: "<website_sc_address>",
				Hidden:    true,
				Action: func(cCtx *cli.Context) error {
					if cCtx.Args().Len() < 1 {
						return fmt.Errorf("invalid number of arguments\nUsage: %s %s", cCtx.App.Name, cCtx.Command.ArgsUsage)
					}

					// since we don't check for yaml config, we can use the default node url
					// this fn might actually not be used down the line
					networkInfos := pkgConfig.NewNetworkConfig(pkgConfig.DefaultNodeURL)
					siteAddress := cCtx.Args().Get(0)

					err := viewWebsite(siteAddress, &networkInfos)
					if err != nil {
						logger.Fatalf("An error occured while attempting to view website %s: %v", siteAddress, err)
					}

					return nil
				},
			},
			{
				Name:      "delete",
				Aliases:   []string{"d"},
				Usage:     "Delete a website",
				ArgsUsage: "<website_sc_address>",
				Flags:     flags,
				Action: func(cCtx *cli.Context) error {
					if cCtx.Args().Len() < 1 {
						return fmt.Errorf("invalid number of arguments\nUsage: %s %s", cCtx.App.Name, cCtx.Command.ArgsUsage)
					}

					config, err := yamlConfig.LoadConfig(configPath, nodeURL, nickname)
					if err != nil {
						return fmt.Errorf("failed to load yaml config: %v", err)
					}

					siteAddress := cCtx.Args().Get(0)

					if err := deleteWebsite(siteAddress, config); err != nil {
						logger.Fatalf("An error occurred while attempting to delete website %s: %v", siteAddress, err)
					}
					return nil
				},
			},
		},
	}

	err := logger.InitializeGlobal("./deweb-cli.log")
	if err != nil {
		log.Fatalf("failed to initialize logger: %v", err)
	}

	if err := app.Run(os.Args); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
	}
}

func deployWebsite(config *yamlConfig.Config, filepath string) (string, error) {
	logger.Debugf("Deploying website contract with config: %+v", config.SCConfig)

	deploymentResult, err := website.Deploy(config.WalletConfig.WalletNickname, &config.NetworkConfig, &config.SCConfig)
	if err != nil {
		return "", fmt.Errorf("failed to deploy website contract: %v", err)
	}

	logger.Infof("Website contract deployed at address: %s", deploymentResult.Address)

	chunks, err := processFileForUpload(filepath)
	if err != nil {
		return "", fmt.Errorf("failed to process file for upload: %v", err)
	}

	logger.Debugf("Uploading %d chunks to website at address: %s", len(chunks), deploymentResult.Address)

	err = uploadChunks(chunks, deploymentResult.Address, config)
	if err != nil {
		return "", fmt.Errorf("failed to upload chunks: %v", err)
	}

	return deploymentResult.Address, nil
}

func uploadChunks(chunks [][]byte, address string, config *yamlConfig.Config) error {
	for i, chunk := range chunks {
		logger.Infof("Uploading chunk %d out of %d...", i+1, len(chunks))
		logger.Debugf("Uploading chunk %d with size: %d", i, len(chunk))

		operationID, err := website.UploadChunk(address, config.WalletConfig, &config.NetworkConfig, &config.SCConfig, chunk, i)
		if err != nil {
			return fmt.Errorf("failed to upload chunk %d: %v", i, err)
		}

		logger.Infof("Chunk %d out of %d uploaded with operation ID: %s", i+1, len(chunks), operationID)
	}

	return nil
}

// deleteIfRequired checks if the website has more chunks than the new website
func deleteIfRequired(config *yamlConfig.Config, siteAddress string, editChunksNbr int) error {
	client := node.NewClient(config.NetworkConfig.NodeURL)

	deployedChunks, err := website.GetNumberOfChunks(client, siteAddress)
	if err != nil {
		return fmt.Errorf("failed to get number of chunks for website %s: %v", siteAddress, err)
	}

	logger.Debugf("Website %s has %d deployed chunks", siteAddress, deployedChunks)

	if deployedChunks > int32(editChunksNbr) {
		logger.Infof("Website %s has more chunks than the new website, deleting and redeploying", siteAddress)

		if err = deleteWebsite(siteAddress, config); err != nil {
			return fmt.Errorf("failed to delete website %s: %v", siteAddress, err)
		}
	}

	return nil
}

func processFileForUpload(filepath string) ([][]byte, error) {
	websiteBytes, err := utils.ReadFileBytes(filepath)
	if err != nil {
		return nil, fmt.Errorf("failed to get website zip bytes: %w", err)
	}

	return website.DivideIntoChunks(websiteBytes, website.ChunkSize), nil
}

func viewWebsite(scAddress string, networkInfos *msConfig.NetworkInfos) error {
	owner, err := website.GetOwner(networkInfos, scAddress)
	if err != nil {
		logger.Warnf("failed to get owner of %s: %v", scAddress, err)
	}

	logger.Infof("Website owner: %s", owner)

	// For debugging  cache purposes:
	// zipFile, err := webmanager.RequestWebsite(scAddress, networkInfos)
	zipFile, err := website.Fetch(networkInfos, scAddress)
	if err != nil {
		return fmt.Errorf("failed to request website: %v", err)
	}

	firstCreationTimestamp, err := website.GetFirstCreationTimestamp(networkInfos, scAddress)
	if err != nil {
		logger.Warnf("failed to get first creation timestamp of %s: %v", scAddress, err)
	}

	lastUpdateTimestamp, err := website.GetLastUpdateTimestamp(networkInfos, scAddress)
	if err != nil {
		logger.Warnf("failed to get last update timestamp of %s: %v", scAddress, err)
	}

	fileName := "index.html"

	indexFile, err := zipper.ReadFileFromZip(zipFile, fileName)
	if err != nil {
		return fmt.Errorf("failed to get file %s from zip: %v", fileName, err)
	}

	prettyPrintUnixTimestamp(int64(firstCreationTimestamp), int64(lastUpdateTimestamp))

	logger.Infof("viewing content for %s:\n %s", scAddress, indexFile)

	return nil
}

// TODO: delete website from cache if it is deleted from the blockchain
func deleteWebsite(siteAddress string, config *yamlConfig.Config) error {
	operationID, err := website.Delete(&config.SCConfig, config.WalletConfig, &config.NetworkConfig, siteAddress)
	if err != nil {
		return fmt.Errorf("error while deleting website %s: %v", siteAddress, err)
	}

	logger.Infof("Website %s deleted with operation ID: %s", siteAddress, *operationID)

	return nil
}

func prettyPrintUnixTimestamp(firstCreationTimestamp int64, lastUpdateTimestamp int64) {
	readableFCTimestamp := getDateFromTimestamp(firstCreationTimestamp)
	readableLUTimestamp := getDateFromTimestamp(lastUpdateTimestamp)

	logger.Infof("First creation date: %s", readableFCTimestamp)
	logger.Infof("Last update date: %s", readableLUTimestamp)
}

func getDateFromTimestamp(timestamp int64) string {
	seconds := timestamp / 1000
	t := time.Unix(seconds, 0)
	date := t.Format(time.RFC3339)

	return date
}
