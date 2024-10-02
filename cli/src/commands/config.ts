import { OptionValues } from 'commander'
import { existsSync, readFileSync } from 'fs'

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

interface CommandOptions {
  config: string
  node_url: string
  wallet: string
  password: string
}
export function setProgramOptions(program: any): void {
  const commandOptions: CommandOptions = program.opts() as CommandOptions
  if (existsSync(commandOptions.config)) {
    const configOptions = parseConfigFile(commandOptions.config)

    // commandOptions get priority over configOptions
    const programOptions = mergeConfigAndOptions(commandOptions, configOptions)
    for (const [key, value] of Object.entries(programOptions)) {
      program.setOptionValue(key, value)
    }
  }
}
