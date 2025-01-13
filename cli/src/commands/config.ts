import { Address, PublicApiUrl } from '@massalabs/massa-web3'
import { OptionValues } from 'commander'
import { readFileSync } from 'fs'

import { Metadata } from '../lib/website/models/Metadata'

export const DEFAULT_CHUNK_SIZE = 64000
const DEFAULT_NODE_URL = PublicApiUrl.Buildnet

interface Config {
  wallet_password: string
  wallet_path: string
  node_url: string
  chunk_size: number
  secret_key: string
  address: string
  metadatas: { [key: string]: string }
}

export function parseConfigFile(filePath: string): Config {
  const fileContent = readFileSync(filePath, 'utf-8')
  try {
    const config = JSON.parse(fileContent) as Config

    // If address is provided, make sure it's valid
    if (config.address) {
      try {
        Address.fromString(config.address)
      } catch (error) {
        throw new Error(`Invalid address in config file: ${error}`)
      }
    }

    return config
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
    address: configOptions.address || '',
    metadatas: configOptions.metadatas
      ? makeMetadataArray(configOptions.metadatas)
      : [],
  }
}

function makeMetadataArray(metadatas: { [key: string]: string }): Metadata[] {
  return Object.entries(metadatas).map(
    ([key, value]) => new Metadata(key, value)
  )
}

export function setDefaultValues(commandOptions: OptionValues): OptionValues {
  return {
    node_url: commandOptions.node_url || DEFAULT_NODE_URL,
    chunk_size: commandOptions.chunk_size || DEFAULT_CHUNK_SIZE,
  }
}
