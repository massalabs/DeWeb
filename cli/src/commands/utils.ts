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

  var keyPair: KeyPair
  if (
    (globalOptions.wallet && !globalOptions.password) ||
    (!globalOptions.wallet && globalOptions.password)
  ) {
    throw new Error('Both wallet and password must be provided together.')
  }

  if (globalOptions.wallet && globalOptions.password) {
    if (!globalOptions.wallet.endsWith('.yaml')) {
      throw new Error('Wallet file must be a YAML file')
    }

    keyPair = await importFromYamlKeyStore(
      globalOptions.wallet,
      globalOptions.password
    )
  } else {
    keyPair = await KeyPair.fromEnv(KEY_ENV_NAME)
  }

  const provider = Web3Provider.fromRPCUrl(
    globalOptions.node_url as string,
    keyPair
  )

  return provider
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
