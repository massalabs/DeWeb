package config

type WalletConfig struct {
	WalletNickname string
	NodeUrl        string
}

func NewWalletConfig(walletNickname string, nodeURL string) WalletConfig {
	return WalletConfig{
		WalletNickname: walletNickname,
		NodeUrl:        nodeURL,
	}
}
