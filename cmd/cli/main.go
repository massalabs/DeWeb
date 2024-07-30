package main

import (
	"fmt"
	"log"
	"os"

	"github.com/massalabs/DeWeb/int/config"
	"github.com/massalabs/DeWeb/int/utils"
	"github.com/massalabs/DeWeb/int/zipper"
	pkgConfig "github.com/massalabs/DeWeb/pkg/config"
	"github.com/massalabs/DeWeb/pkg/website"
	"github.com/massalabs/station/pkg/logger"
	"github.com/urfave/cli/v2"
)

func main() {
	app := &cli.App{
		Name:      "DeWeb CLI",
		Usage:     "CLI app for deploying websites",
		UsageText: "Upload, delete & edit DeWeb site from the terminal",
		Version:   config.Version,
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
				ArgsUsage: "<wallet nickname> <website zip file path>",
				Action: func(cCtx *cli.Context) error {
					if cCtx.Args().Len() < 2 {
						return fmt.Errorf("invalid number of arguments\nUsage: %s %s", cCtx.App.Name, cCtx.Command.ArgsUsage)
					}

					filepath := cCtx.Args().Get(1)
					config := pkgConfig.DefaultConfig(cCtx.Args().Get(0), "https://buildnet.massa.net/api/v2")

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
				ArgsUsage: "<wallet nickname> <website sc address> <website zip file path>",
				Action: func(cCtx *cli.Context) error {
					if cCtx.Args().Len() < 3 {
						return fmt.Errorf("invalid number of arguments\nUsage: %s %s", cCtx.App.Name, cCtx.Command.ArgsUsage)
					}

					config := pkgConfig.DefaultConfig(cCtx.Args().Get(0), "https://buildnet.massa.net/api/v2")
					siteAddress := cCtx.Args().Get(1)
					filepath := cCtx.Args().Get(2)

					bytecode, err := processFileForUpload(filepath)
					if err != nil {
						logger.Fatalf("failed to process file for upload: %v", err)
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
				ArgsUsage: "<nickname> <website sc address>",
				Action: func(cCtx *cli.Context) error {
					if cCtx.Args().Len() < 2 {
						return fmt.Errorf("invalid number of arguments\nUsage: %s %s", cCtx.App.Name, cCtx.Command.ArgsUsage)
					}

					config := pkgConfig.DefaultConfig(cCtx.Args().Get(0), "https://buildnet.massa.net/api/v2")
					siteAddress := cCtx.Args().Get(1)

					err := viewWebsite(siteAddress, config)
					if err != nil {
						logger.Fatalf("An error occured while attempting to view website %s: %v", siteAddress, err)
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

func deployWebsite(config *pkgConfig.Config, filepath string) (string, error) {
	logger.Debugf("Deploying website contract with config: %+v", config)

	deploymentResult, err := website.Deploy(config)
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

func uploadChunks(chunks [][]byte, address string, config *pkgConfig.Config) error {
	for i, chunk := range chunks {
		logger.Debugf("Uploading chunk %d with size: %d", i, len(chunk))

		operationID, err := website.UploadChunk(address, config, chunk, i)
		if err != nil {
			return fmt.Errorf("failed to upload chunk %d: %v", i, err)
		}

		logger.Infof("Chunk %d uploaded with operation ID: %s", i, operationID)
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

func viewWebsite(scAddress string, config *pkgConfig.Config) error {
	owner, err := website.GetOwner(&config.NetworkInfos, scAddress)
	if err != nil {
		logger.Warnf("failed to get owner of %s: %v", scAddress, err)
	}

	logger.Infof("Website owner: %s", owner)

	zipFile, err := website.CheckWebsiteCache(scAddress, config)
	if err != nil {
		return fmt.Errorf("failed to check website cache: %v", err)
	}

	fileName := "index.html"

	indexFile, err := zipper.ReadFileFromZip(zipFile, fileName)
	if err != nil {
		return fmt.Errorf("failed to get file %s from zip: %v", fileName, err)
	}

	logger.Infof("viewing content for %s:\n %s", scAddress, indexFile)

	return nil
}
