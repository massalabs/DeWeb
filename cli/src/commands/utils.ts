import {
  Account,
  AccountKeyStore,
  Address,
  Account as KeyPair,
  Web3Provider,
} from '@massalabs/massa-web3'
import { OptionValues } from 'commander'
import { readFileSync } from 'fs'
import { parse as yamlParse } from 'yaml'

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

  let keyPair: KeyPair
  let provider: Web3Provider

  try {
    keyPair = await KeyPair.fromEnv(KEY_ENV_NAME)
    console.info('Initializing provider with SECRET_KEY from env\n')
    provider = Web3Provider.fromRPCUrl(
      globalOptions.node_url as string,
      keyPair
    )
    return provider
  } catch (error) {
    console.warn(`Failed to initialize keyPair: ${error} \n`)
  }

  try {
    if (!globalOptions?.secret_key) throw new Error()
    keyPair = await KeyPair.fromPrivateKey(globalOptions.secret_key)
    console.info('Initializing provider with SECRET_KEY from config file\n')
    provider = Web3Provider.fromRPCUrl(
      globalOptions.node_url as string,
      keyPair
    )
    return provider
  } catch (error) {
    console.warn(`Failed to initialize keyPair: ${error} \n`)
  }

  try {
    if (
      (globalOptions.wallet && !globalOptions.password) ||
      (!globalOptions.wallet && globalOptions.password)
    ) {
      throw new Error('Both wallet and password must be provided together.')
    }

    if (!globalOptions.wallet.endsWith('.yaml')) {
      throw new Error('Wallet file must be a YAML file')
    }

    console.info('Initializing provider with wallet & password\n')

    keyPair = await importFromYamlKeyStore(
      globalOptions.wallet,
      globalOptions.password
    )
    provider = Web3Provider.fromRPCUrl(
      globalOptions.node_url as string,
      keyPair
    )
    return provider
  } catch (error) {
    console.warn(`Failed to import wallet from yaml file with: ${error}`)
  }

  throw new Error('Failed to initialize provider with any available method')
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

interface WalletConfig {
  wallet: string
  password: string
}

interface Config {
  wallet_config: WalletConfig
  node_url: string
  chunk_size: number
  secret_key: string
}

export function parseConfigFile(filePath: string): Config {
  const fileContent = readFileSync(filePath, 'utf-8')
  try {
    const parsedData = JSON.parse(fileContent)
    return parsedData
  } catch (error) {
    throw new Error(`Failed to parse file: ${error}`)
  }
}

export function setProgramOptions(
  commandOptions: OptionValues,
  configOptions: Config
): OptionValues {
  if (!configOptions) return commandOptions

  const wallet = commandOptions.wallet || configOptions.wallet_config.wallet
  const password =
    commandOptions.password || configOptions.wallet_config.password
  const node_url = commandOptions.node_url || configOptions.node_url
  const chunk_size = commandOptions.chunk_size || configOptions.chunk_size

  return { wallet, password, node_url, chunk_size }
}
