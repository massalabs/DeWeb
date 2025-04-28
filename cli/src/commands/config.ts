import { PublicApiUrl } from '@massalabs/massa-web3'
import { existsSync, readFileSync } from 'fs'

import { Metadata } from '../lib/website/models/Metadata'
import { OptionValues } from 'commander'
import { validateWebsiteAddress } from './utils'

export const DEFAULT_CHUNK_SIZE = 64000
export const DEFAULT_NODE_URL = PublicApiUrl.Buildnet
export const DEFAULT_CONFIG_FILE = 'deweb_cli_config.json'

interface Config {
  wallet_password?: string
  wallet_path?: string
  node_url: string
  chunk_size: number
  secret_key?: string
  address?: string
  metadatas?: Metadata[]
  config: string
}

const DEFAULT_CONFIG: Config = {
  config: DEFAULT_CONFIG_FILE,
  node_url: DEFAULT_NODE_URL,
  chunk_size: DEFAULT_CHUNK_SIZE,
}

function parseConfigFile(filePath: string): Config {
  if (!existsSync(filePath)) {
    if (filePath !== DEFAULT_CONFIG_FILE) {
      throw new Error(`Config file not found: ${filePath}`)
    }
    console.log(`No config file found, using default config`)
    return DEFAULT_CONFIG
  }

  try {
    const config = JSON.parse(readFileSync(filePath, 'utf-8'))

    if (config.metadatas) {
      config.metadatas = makeMetadataArray(config.metadatas)
    }

    return config
  } catch (error) {
    throw new Error(`Failed to parse file: ${error}`)
  }
}

function makeMetadataArray(metadatas: { [key: string]: string }): Metadata[] {
  return Object.entries(metadatas).map(
    ([key, value]) => new Metadata(key, value)
  )
}

function validateConfig(config: Config): void {
  // If address is provided, make sure it's valid
  if (config.address) {
    validateWebsiteAddress(config.address)
  }
}

export function loadConfig(options: OptionValues): Config {
  const config = parseConfigFile(options.config as string)

  // commandOptions get priority over configOptions
  const conf = {
    ...DEFAULT_CONFIG,
    ...config,
    ...options,
  }
  validateConfig(conf)
  return conf
}
