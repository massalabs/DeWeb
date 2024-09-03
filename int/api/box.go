package api

import (
	"bytes"
	_ "embed"
	"fmt"
	"log"
	"os"

	"github.com/massalabs/DeWeb/int/config"
	pkgConfig "github.com/massalabs/DeWeb/pkg/config"
)

const (
	UnknownNetwork = "Unknown"
	networkDocURL  = "https://docs.massa.net/docs/build/networks-faucets/public-networks"
)

//go:embed resources/massa_logomark.svg
var massaLogomark []byte

//go:embed resources/injectedStyle.css
var injectedStyle []byte

func InjectOnChainBox(content []byte, chainID uint64) []byte {
	content = injectStyles(content)
	content = injectHtmlBox(content, chainID)

	return content
}

// InjectStyles injects the DeWeb label style into the HTML content
func injectStyles(content []byte) []byte {
	styleHTML := fmt.Sprintf(`
  		<!-- Injected DeWeb label style -->
  		  <style type="text/css" >
  		    %s
  		  </style>
  		<!-- Injected DeWeb label style -->`, injectedStyle)

	return bytes.Replace(content, []byte("</head>"), []byte(styleHTML), 1)
}

// InjectHtmlBox injects a "Hosted by Massa" box into the HTML content
func injectHtmlBox(content []byte, chainID uint64) []byte {
	chainName := getChainName(chainID)
	chainDocURL := getChainDocURL(chainID)

	boxHtml := "int/api/resources/massaBox.html"

	boxTemplate, err := os.ReadFile(boxHtml)
	if err != nil {
		log.Fatalf("failed to read template file: %v", err)
	}

	boxHTML := fmt.Sprintf(string(boxTemplate), massaLogomark, chainDocURL, chainName, config.Version)

	// Insert the boxHTML before the closing </body> tag
	return bytes.Replace(content, []byte("<body>"), []byte(boxHTML), 1)
}

// getChainName returns the name of the chain based on the chainID
func getChainName(chainID uint64) string {
	switch chainID {
	case pkgConfig.BuildnetChainID:
		return pkgConfig.BuildnetName
	case pkgConfig.MainnetChainID:
		return pkgConfig.MainnetName
	default:
		return UnknownNetwork
	}
}

// getChainDocURL returns the URL of the chain documentation based on the chainID
func getChainDocURL(chainID uint64) string {
	switch chainID {
	case pkgConfig.BuildnetChainID:
		return networkDocURL + "#buildnet"
	case pkgConfig.MainnetChainID:
		return networkDocURL + "#mainnet"
	default:
		return networkDocURL
	}
}
