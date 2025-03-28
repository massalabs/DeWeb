import {
  Account,
  AccountKeyStore,
  Address,
  JsonRpcPublicProvider,
  Account as KeyPair,
  PublicProvider,
  Web3Provider,
} from '@massalabs/massa-web3'
import { OptionValues } from 'commander'
import { readFileSync } from 'fs'
import { parse as yamlParse } from 'yaml'
import { DEFAULT_NODE_URL } from './config'

const KEY_ENV_NAME = 'SECRET_KEY'

/**
 * Load the keypair using environment variables, secret_key, or wallet file
 * @param globalOptions - the global options
 * @returns the keypair
 */
async function loadKeyPair(globalOptions: OptionValues): Promise<KeyPair> {
  try {
    const envSecretKey = process.env[KEY_ENV_NAME]

    if (envSecretKey) {
      return await KeyPair.fromEnv(KEY_ENV_NAME)
    }

    if (globalOptions.secret_key) {
      return await KeyPair.fromPrivateKey(globalOptions.secret_key)
    }

    if (
      globalOptions.wallet &&
      globalOptions.password &&
      globalOptions.wallet.endsWith('.yaml')
    ) {
      return await importFromYamlKeyStore(
        globalOptions.wallet,
        globalOptions.password
      )
    }

    throw new Error('No valid method to load keypair.')
  } catch (error) {
    console.warn(`Failed to initialize keyPair: ${error}`)
    throw error
  }
}

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

  try {
    const keyPair = await loadKeyPair(globalOptions)

    return Web3Provider.fromRPCUrl(globalOptions.node_url as string, keyPair)
  } catch (error) {
    console.error(`Failed to initialize provider: ${error}`)
    throw new Error('Failed to initialize provider with any available method')
  }
}

/**
 * Initialize a public provider
 * @param globalOptions - the global options
 * @returns the public provider
 */
export async function initPublicProvider(
  globalOptions: OptionValues
): Promise<PublicProvider> {
  let rpcUrl: string = DEFAULT_NODE_URL
  if (globalOptions.node_url) {
    rpcUrl = globalOptions.node_url as string
  } else {
    console.warn(
      `No node_url provided, using default public API URL: ${rpcUrl}`
    )
  }

  return JsonRpcPublicProvider.fromRPCUrl(rpcUrl)
}

/**
 * Import an account from a YAML key store file
 * @param filepath - the file path
 * @param password - the password
 * @returns the account
 */
async function importFromYamlKeyStore(
  filepath: string,
  password: string
): Promise<Account> {
  const fileContent = readFileSync(filepath, 'utf8')
  const parsedData = yamlParse(fileContent) as AccountKeyStore

  return await Account.fromKeyStore(parsedData, password)
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
