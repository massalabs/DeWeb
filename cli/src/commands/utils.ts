import {
  Account,
  AccountKeyStore,
  Address,
  JsonRpcPublicProvider,
  Account as KeyPair,
  Mas,
  PublicProvider,
  Web3Provider,
  isImmutable,
} from '@massalabs/massa-web3'

import { OptionValues } from 'commander'
import { readFileSync } from 'fs'
import { parse as yamlParse } from 'yaml'

const KEY_ENV_NAME = 'SECRET_KEY'

/**
 * Load the keypair using environment variables, secret_key, or wallet file
 * @param globalOptions - the global options
 * @returns the keypair
 */
async function loadKeyPair(globalOptions: OptionValues): Promise<KeyPair> {
  const envSecretKey = process.env[KEY_ENV_NAME]

  if (envSecretKey) {
    return KeyPair.fromEnv(KEY_ENV_NAME)
  }

  if (globalOptions.secret_key) {
    return KeyPair.fromPrivateKey(globalOptions.secret_key)
  }

  if (
    globalOptions.wallet &&
    globalOptions.password &&
    globalOptions.wallet.endsWith('.yaml')
  ) {
    return importFromYamlKeyStore(globalOptions.wallet, globalOptions.password)
  }

  throw new Error('No valid method to load keypair.')
}

/**
 * Make a provider from the node URL and secret key
 * @param globalOptions - the global options
 * @returns the provider
 */
export async function makeProviderFromNodeURLAndSecret(
  globalOptions: OptionValues
): Promise<Web3Provider> {
  const keyPair = await loadKeyPair(globalOptions)

  const provider = Web3Provider.fromRPCUrl(globalOptions.node_url, keyPair)

  const { name } = await provider.networkInfos()
  console.log(
    `Using account ${provider.address}. Balance: ${Mas.toString(await provider.balance())} Mas`
  )
  console.log(`Network: ${name}`)
  return provider
}

/**
 * Initialize a public provider
 * @param globalOptions - the global options
 * @returns the public provider
 */
export async function initPublicProvider(
  globalOptions: OptionValues
): Promise<PublicProvider> {
  return JsonRpcPublicProvider.fromRPCUrl(globalOptions.node_url)
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

  return Account.fromKeyStore(parsedData, password)
}

/**
 * Validate the address
 * @param address - the address to validate
 */
export function validateWebsiteAddress(address: string) {
  const addr = Address.fromString(address)
  if (addr.isEOA) {
    throw new Error(
      `Invalid address: ${address}. This is not a website address.`
    )
  }
}

export async function exitIfImmutable(
  address: string,
  provider: PublicProvider,
  errMsg = ''
) {
  const isimmutable = await isImmutable(address, provider, true)
  if (isimmutable) {
    console.error(errMsg || `The website at address ${address} is immutable.`)
    process.exit(1)
  }
}
