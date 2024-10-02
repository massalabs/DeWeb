import { Command } from '@commander-js/extra-typings'
import { PublicApiUrl } from '@massalabs/massa-web3'

import { deleteCommand } from './commands/delete'
import { listFilesCommand } from './commands/list'
import { showFileCommand } from './commands/showFile'
import { uploadCommand } from './commands/upload'

import { setProgramOptions } from './commands/config'

const version = process.env.VERSION || 'dev'
const defaultConfigPath = 'deweb_cli_config.json'
const defaultNodeUrl = PublicApiUrl.Buildnet

const program = new Command()

program
  .name('deweb-cli')
  .description('CLI app for deploying websites')
  .version(version)
  .option('-c, --config <path>', 'Path to the config file', defaultConfigPath)
  .option('-n, --node_url <url>', 'Node URL', defaultNodeUrl)
  .option('-w, --wallet <path>', 'Path to the wallet file')
  .option('-p, --password <password>', 'Password for the wallet file')

program.addCommand(uploadCommand)
program.addCommand(deleteCommand)
program.addCommand(listFilesCommand)
program.addCommand(showFileCommand)

setProgramOptions(program.opts())

program.parse()
