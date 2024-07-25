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
)

func main() {
	err := logger.InitializeGlobal("./deweb-cli.log")
	if err != nil {
		log.Fatalf("failed to initialize logger: %v", err)
	}

	logger.Infof("Hello, World from DeWeb CLI %s !", config.Version)

	if len(os.Args) < 2 {
		logger.Fatalf("usage: %s <website.zip>", os.Args[0])
	}

	config := pkgConfig.DefaultConfig("fullpower", "https://buildnet.massa.net/api/v2")

	address, err := deployWebsite(config)
	if err != nil {
		logger.Fatalf("failed to deploy website: %v", err)
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

func deployWebsite(config *pkgConfig.Config) (string, error) {
	logger.Debugf("Deploying website contract with config: %+v", config)

	deploymentResult, err := website.Deploy(config)
	if err != nil {
		return "", fmt.Errorf("failed to deploy website contract: %v", err)
	}

	logger.Infof("Website contract deployed at address: %s", deploymentResult.Address)

	chunks, err := processFileForUpload(os.Args[1])
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
