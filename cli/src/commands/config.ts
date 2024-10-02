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

  const wallet = commandOptions.wallet || configOptions.wallet_path
  const password = commandOptions.password || configOptions.wallet_password
  const node_url = commandOptions.node_url || configOptions.node_url
  const chunk_size = commandOptions.chunk_size || configOptions.chunk_size
  const secret_key = configOptions.secret_key || ''

  return {
    wallet,
    password,
    node_url,
    chunk_size,
    secret_key,
  }
}
