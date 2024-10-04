import { PublicApiUrl } from '@massalabs/massa-web3'
import { OptionValues } from 'commander'
import { readFileSync } from 'fs'

export const DEFAULT_CHUNK_SIZE = 64000
const DEFAULT_NODE_URL = PublicApiUrl.Buildnet

interface Config {
  wallet_password: string
  wallet_path: string
  node_url: string
  chunk_size: number
  secret_key: string
}

export function parseConfigFile(filePath: string): Config {
  const fileContent = readFileSync(filePath, 'utf-8')
  try {
    return JSON.parse(fileContent)
  } catch (error) {
    throw new Error(`Failed to parse file: ${error}`)
  }
}

export function mergeConfigAndOptions(
  commandOptions: OptionValues,
  configOptions: Config
): OptionValues {
  if (!configOptions) return commandOptions

  return {
    wallet: commandOptions.wallet || configOptions.wallet_path,
    password: commandOptions.password || configOptions.wallet_password,
    node_url:
      commandOptions.node_url || configOptions.node_url || DEFAULT_NODE_URL,
    chunk_size: configOptions.chunk_size || DEFAULT_CHUNK_SIZE,
    secret_key: configOptions.secret_key || '',
  }
}

export function setDefaultValues(commandOptions: OptionValues): OptionValues {
  return {
    node_url: commandOptions.node_url || DEFAULT_NODE_URL,
    chunk_size: commandOptions.chunk_size || DEFAULT_CHUNK_SIZE,
  }
}
