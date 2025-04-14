#!/usr/bin/env node

import { Command } from '@commander-js/extra-typings'

import { deleteCommand } from './commands/delete'
import { listFilesCommand } from './commands/list'
import { showFileCommand } from './commands/showFile'
import { uploadCommand } from './commands/upload'
import { metadataCommand } from './commands/metadata'
import { DEFAULT_CONFIG_FILE } from './commands/config'

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

program.addCommand(uploadCommand)
program.addCommand(deleteCommand)
program.addCommand(listFilesCommand)
program.addCommand(showFileCommand)
program.addCommand(metadataCommand)

program.parse()
