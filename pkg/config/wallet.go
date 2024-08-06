package config

type WalletConfig struct {
	WalletNickname string
	NodeUrl        string
}

const DefaultNodeURL = "https://buildnet.massa.net/api/v2"

func DefaultWalletConfig() *WalletConfig {
	return &WalletConfig{
		WalletNickname: "",
		NodeUrl:        DefaultNodeURL,
	}
}
