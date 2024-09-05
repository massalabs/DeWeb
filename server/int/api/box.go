package api

import (
	"bytes"
	_ "embed"
	"fmt"
	"regexp"

	"github.com/massalabs/deweb-server/int/config"
	pkgConfig "github.com/massalabs/deweb-server/pkg/config"
)

const (
	UnknownNetwork = "Unknown"
	networkDocURL  = "https://docs.massa.net/docs/build/networks-faucets/public-networks"
)

//go:embed resources/massa_logomark.svg
var massaLogomark []byte

//go:embed resources/injectedStyle.css
var injectedStyle []byte

//go:embed resources/massaBox.html
var massaBox []byte

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

	boxHTML := fmt.Sprintf(string(massaBox), massaLogomark, chainDocURL, chainName, config.Version)

	bodyRegex := regexp.MustCompile(`(?i)<body[^>]*>`)

	loc := bodyRegex.FindIndex(content)
	if loc == nil {
		return content
	}

	result := append(content[:loc[1]], append([]byte(boxHTML), content[loc[1]:]...)...)

	return result
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
