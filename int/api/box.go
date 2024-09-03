package api

import (
	"bytes"
	_ "embed"
	"fmt"

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

// InjectStyles injects the DeWeb label style into the HTML content
func InjectStyles(content []byte) []byte {
	styleHTML := fmt.Sprintf(`
  <!-- Injected DeWeb label style -->
    <style type="text/css" >
      %s
    </style>
    </head>
  `, injectedStyle)

	return bytes.Replace(content, []byte("</head>"), []byte(styleHTML), 1)
}

// InjectHtmlBox injects a "Hosted by Massa" box into the HTML content
func InjectHtmlBox(content []byte, chainID uint64) []byte {
	chainName := getChainName(chainID)
	chainDocURL := getChainDocURL(chainID)

	boxHTML := fmt.Sprintf(`
      <div class="massa-box" id="massaBox">
      <div class="massa-box-content">
        <a
          class="massa-logo-link"
          href="https://massa.net"
          target="_blank"
          onclick="document.getElementById('massaBox').classList.add('show-all')"
        >
          <div class="massa-logo">%s</div>
        </a>
        <a
          class="massa-link"
          href="https://docs.massa.net/docs/deweb/home"
          target="_blank"
        >
          <strong>hosted on chain</strong>
        </a>
        <a class="massa-link" href="%s" target="_blank">%s</a>
        <div class="deweb-version">%s</div>
        <button
          class="hide-button"
          onclick="document.getElementById('massaBox').classList.add('massa-box-disappeared')"
        >
          &#171;
        </button>
      </div>
    </div>`, massaLogomark, chainDocURL, chainName, config.Version)

	// Insert the boxHTML before the closing </body> tag
	return bytes.Replace(content, []byte("</body>"), []byte(boxHTML), 1)
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
