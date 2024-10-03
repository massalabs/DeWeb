import { OptionValues } from 'commander'
import { readFileSync } from 'fs'

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
    node_url: commandOptions.node_url || configOptions.node_url,
    chunk_size: commandOptions.chunk_size || configOptions.chunk_size,
    secret_key: configOptions.secret_key || ''
  }
}
