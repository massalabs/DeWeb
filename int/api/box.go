package api

import (
	"bytes"
	_ "embed"
	"fmt"

	"github.com/massalabs/DeWeb/int/config"
	pkgConfig "github.com/massalabs/DeWeb/pkg/config"
)

var networkDocURL = "https://docs.massa.net/docs/build/networks-faucets/public-networks"

//go:embed massa_logomark.svg
var massaLogomark []byte

// InjectHostedByMassaBox injects a "Hosted by Massa" box into the HTML content
func InjectHostedByMassaBox(content []byte, chainID uint64) []byte {
	chainName := getChainName(chainID)
	chainDocURL := getChainDocURL(chainID)

	boxHTML := fmt.Sprintf(`
		<style>
			.hosted-by-massa-box {
				position: fixed;
				bottom: 10px;
				left: 10px;
				background-color: #FFFFFF;
				color: #010112;
				padding: 8px;
				border-radius: 8px;
				z-index: 10000;
				display: flex;
				flex-direction: column;
				gap: 4px;
				font-family: Urbane, sans-serif;
				font-size: 16px;
				line-height: 16px;
				box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
			}
			.hosted-by-massa-box a {
				font-weight: 700;
				text-decoration: none;
				color: #010112;
			}
			.hosted-by-massa-box .logo {
				width: 22px;
				height: 22px;
			}
			.hosted-by-massa-box .hide-button {
				background: none;
				border: none;
				color: #010112;
				font-size: 16px;
				cursor: pointer;
				position: absolute;
				top: 5px;
				right: 5px;
			}
		</style>
		<div class="hosted-by-massa-box" id="massaBox">
			<button class="hide-button" onclick="document.getElementById('massaBox').style.display='none'">✖</button>
			<div style="display: flex; align-items: center; gap: 4px;">
				<a href="https://massa.net" target="_blank">
					<div class="logo">%s</div>
				</a>
				<a href="https://docs.massa.net/docs/deweb/home" target="_blank">
					<div style="margin-right: 12px">Hosted on chain</div>
				</a>
			</div>
			<div style="display: flex; justify-content: space-between;">
				<a href="%s" target="_blank" style="font-weight: 400;">%s</a>
				<div>%s</div>
			</div>
		</div>
	</body>`, massaLogomark, chainDocURL, chainName, config.Version)

	// Insert the boxHTML before the closing </body> tag
	return bytes.Replace(content, []byte("</body>"), []byte(boxHTML), 1)
}

// getChainName returns the name of the chain based on the chainID
func getChainName(chainID uint64) string {
	switch chainID {
	case pkgConfig.BuildnetChainID:
		return pkgConfig.BuildnetName
	default:
		return pkgConfig.MainnetName
	}
}

// getChainDocURL returns the URL of the chain documentation based on the chainID
func getChainDocURL(chainID uint64) string {
	switch chainID {
	case pkgConfig.BuildnetChainID:
		return networkDocURL + "#buildnet"
	default:
		return networkDocURL + "#mainnet"
	}
}
