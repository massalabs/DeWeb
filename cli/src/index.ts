#!/usr/bin/env node

import { Command } from '@commander-js/extra-typings'

import { deleteCommand } from './commands/delete'
import { listFilesCommand } from './commands/list'
import { showFileCommand } from './commands/showFile'
import { uploadCommand } from './commands/upload'
import { metadataCommand } from './commands/metadata'
import { DEFAULT_CONFIG_FILE } from './commands/config'

import { existsSync } from 'fs'
import {
  mergeConfigAndOptions,
  parseConfigFile,
  setDefaultValues,
} from './commands/config'

import { Metadata } from './lib/website/models/Metadata'
import { handleDisclaimer } from './tasks/disclaimer'

const version = process.env.VERSION || 'dev'

const program = new Command()

program
  .name('deweb-cli')
  .description('CLI app for deploying websites')
  .version(version)
  .option('-c, --config <path>', 'Path to the config file', DEFAULT_CONFIG_FILE)
  .option('-n, --node_url <url>', 'Node URL')
  .option('-w, --wallet <path>', 'Path to the wallet file')
  .option('-p, --password <password>', 'Password for the wallet file')
  .option('-a, --accept_disclaimer', 'Accept the legal disclaimer')

program.addCommand(uploadCommand)
program.addCommand(deleteCommand)
program.addCommand(listFilesCommand)
program.addCommand(showFileCommand)
program.addCommand(metadataCommand)

interface OptionValues {
  config: string
  node_url: string
  wallet: string
  password: string
  address: string
  metadatas: Metadata[]
  accept_disclaimer: boolean
}

function setupConfigs(commandOptions: OptionValues) {
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
}

program.hook('preAction', async () => {
  const commandOptions: OptionValues = program.opts() as OptionValues
  if (!commandOptions.accept_disclaimer) {
    try {
      await handleDisclaimer()
    } catch (error) {
      console.error('Failed terms of uses validation, got : ' + error)
      process.exit(1)
    }
  }
  
  setupConfigs(commandOptions)
});

program.parse()
