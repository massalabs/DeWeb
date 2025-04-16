#!/usr/bin/env node

import { Command } from '@commander-js/extra-typings'

import { deleteCommand } from './commands/delete'
import { listFilesCommand } from './commands/list'
import { showFileCommand } from './commands/showFile'
import { uploadCommand } from './commands/upload'
import { metadataCommand } from './commands/metadata'
import { DEFAULT_CONFIG_FILE } from './commands/config'

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

async function disclaimer() {
  const commandOptions: OptionValues = program.opts() as OptionValues
  if (!commandOptions.accept_disclaimer) {
    try {
      await handleDisclaimer()
    } catch (error) {
      console.error('Failed terms of uses validation, got : ' + error)
      process.exit(1)
    }
  }
}

// execute before each command
program.hook('preAction', async () => {
  await disclaimer()
});

// execute when the cli is run without any command
program.action(async () => {
  await disclaimer()
})

program.parse()
