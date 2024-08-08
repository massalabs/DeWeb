package config

type WalletConfig struct {
	WalletNickname string
	NodeUrl        string
}

const DefaultNodeURL = "https://buildnet.massa.net/api/v2"

func NewWalletConfig(walletNickname string, nodeURL string) WalletConfig {
	return WalletConfig{
		WalletNickname: walletNickname,
		NodeUrl:        nodeURL,
	}
}
