import { Web3Provider, Account as KeyPair } from '@massalabs/massa-web3'
import { OptionValues } from 'commander'

const KEY_ENV_NAME = 'SECRET_KEY'

export async function makeProviderFromNodeURLAndSecret(
  globalOptions: OptionValues
): Promise<Web3Provider> {
  if (!globalOptions.node_url) {
    throw new Error('node_url is not defined. Please use --node_url to set one')
  }

  const keyPair = await KeyPair.fromEnv(KEY_ENV_NAME)
  const provider = Web3Provider.fromRPCUrl(
    globalOptions.node_url as string,
    keyPair
  )

  return provider
}
