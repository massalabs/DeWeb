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
		Name:      "Massa's Great DeWEB CLI",
		Usage:     "CLI app for deploying websites",
		UsageText: "U_ia	pload, delete & edit DeWeb site from the terminal",
		Version:   config.Version,
		Action: func(cCtx *cli.Context) error {
			cli.ShowAppHelp(cCtx)
			return nil
		},

		Commands: []*cli.Command{
			{
				Name:      "upload",
				Aliases:   []string{"u"},
				Usage:     "Upload a website",
				ArgsUsage: "<wallet nickname> <website zip file path>",
				Action: func(cCtx *cli.Context) error {

					if cCtx.Args().Get(0) == "" {
						return fmt.Errorf("wallet nickname is required")
					}

					config := pkgConfig.DefaultConfig(cCtx.Args().Get(0), "https://buildnet.massa.net/api/v2")

					if cCtx.Args().Get(1) == "" {
						return fmt.Errorf("website zip file path is required")
					}

					filepath := cCtx.Args().Get(1)

					address, err := deployWebsite(config, filepath)

					if err != nil {
						logger.Fatalf("failed to deploy website: %v", err)
					}

					logger.Infof("Website uploaded successfully to address: %s", address)
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
		log.Fatal(err)
	}

	logger.Infof("Website uploaded successfully to address: %s", address)

	owner, err := website.GetOwner(&config.NetworkInfos, address)
	if err != nil {
		logger.Fatalf("failed to get website owner: %v", err)
	}

	logger.Infof("Website owner: %s", owner)

	websiteBytes, err := website.Fetch(&config.NetworkInfos, address)
	if err != nil {
		logger.Fatalf("failed to fetch website: %v", err)
	}

	logger.Infof("Website fetched successfully with size: %d", len(websiteBytes))

	outputZipPath := fmt.Sprintf("website_%s.zip", address)

	err = os.WriteFile(outputZipPath, websiteBytes, 0o644)
	if err != nil {
		logger.Error("Failed to write website zip file", err)
		return
	}

	logger.Info("Website successfully written to file: %s", outputZipPath)

	fileName := "index.html"

	content, err := zipper.GetFileFromZip(outputZipPath, fileName)
	if err != nil {
		logger.Error(err)
		return
	}

	logger.Infof("%s content:\n %s", fileName, content)
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
