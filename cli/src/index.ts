#!/usr/bin/env node

import { Command } from '@commander-js/extra-typings'

import { deleteCommand } from './commands/delete'
import { listFilesCommand } from './commands/list'
import { showFileCommand } from './commands/showFile'
import { uploadCommand } from './commands/upload'

import { existsSync } from 'fs'
import {
  mergeConfigAndOptions,
  parseConfigFile,
  setDefaultValues,
} from './commands/config'

import { Metadata } from './lib/website/models/Metadata'

const version = process.env.VERSION || 'dev'
const defaultConfigPath = 'deweb_cli_config.json'

const program = new Command()

program
  .name('deweb-cli')
  .description('CLI app for deploying websites')
  .version(version)
  .option('-c, --config <path>', 'Path to the config file', defaultConfigPath)
  .option('-n, --node_url <url>', 'Node URL')
  .option('-w, --wallet <path>', 'Path to the wallet file')
  .option('-p, --password <password>', 'Password for the wallet file')

program.addCommand(uploadCommand)
program.addCommand(deleteCommand)
program.addCommand(listFilesCommand)
program.addCommand(showFileCommand)

interface OptionValues {
  config: string
  node_url: string
  wallet: string
  password: string
  address: string
  metadatas: Metadata[]
}

const commandOptions: OptionValues = program.opts() as OptionValues

if (existsSync(commandOptions.config)) {
  const configOptions = parseConfigFile(commandOptions.config)
  // commandOptions get priority over configOptions
  const programOptions = mergeConfigAndOptions(commandOptions, configOptions)
  for (const [key, value] of Object.entries(programOptions)) {
    program.setOptionValue(key, value)
  }
} else {
  const defaultValues = setDefaultValues(commandOptions)

  for (const [key, value] of Object.entries(defaultValues)) {
    program.setOptionValue(key, value)
  }
}

program.parse()
