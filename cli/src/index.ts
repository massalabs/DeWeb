import { Command } from '@commander-js/extra-typings'
import { deployCommand } from './commands/deploy'
import { editCommand } from './commands/edit'

const version = process.env.VERSION || 'dev'
const defaultConfigPath = 'deweb_cli_config.json'
const defaultNodeUrl = 'https://buildnet.massa.net/api/v2'

const program = new Command()

program
  .name('deweb-cli')
  .description('CLI app for deploying websites')
  .version(version)
  .option('-c, --config <path>', 'Path to the config file', defaultConfigPath)
  .option('-n, --node_url <url>', 'Node URL', defaultNodeUrl)

program.addCommand(deployCommand)
program.addCommand(editCommand)

program.parse(process.argv)
