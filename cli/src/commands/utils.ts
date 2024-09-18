import {
  Web3Provider,
  Account as KeyPair,
  Address,
} from '@massalabs/massa-web3'
import { OptionValues } from 'commander'

const KEY_ENV_NAME = 'SECRET_KEY'

/**
 * Make a provider from the node URL and secret key
 * @param globalOptions - the global options
 * @returns the provider
 */
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

/**
 * Validate the address
 * @param address - the address to validate
 */
export function validateAddress(address: string) {
  try {
    Address.fromString(address)
  } catch (error) {
    console.error('Invalid address provided:', error)
    process.exit(1)
  }

  if (!address.startsWith('AS')) {
    console.error('User addresses are not supported yet')
    process.exit(1)
  }
}
