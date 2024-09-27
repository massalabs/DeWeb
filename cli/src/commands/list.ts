import { Command } from '@commander-js/extra-typings'
import { SmartContract } from '@massalabs/massa-web3'
import {
  makeProviderFromNodeURLAndSecret,
  parseConfigFile,
  setConfigGlobalOptions,
  validateAddress,
} from './utils'
import { listFiles } from '../lib/website/read'

export const listFilesCommand = new Command('list')
  .alias('ls')
  .description('Lists files from the given website on Massa blockchain')
  .option('-a, --address <address>', 'Address of the website to list')
  .action(async (options, command) => {
    let globalOptions = command.parent?.opts()

    if (!globalOptions) {
      throw new Error(
        'Global options are not defined. This should never happen.'
      )
    }

    const config = parseConfigFile(globalOptions.config as string)

    // set global options from config file if not already set
    globalOptions = setConfigGlobalOptions(globalOptions, config)

    const provider = await makeProviderFromNodeURLAndSecret(
      globalOptions,
      config
    )

    let sc: SmartContract
    if (options.address) {
      validateAddress(options.address)

      sc = new SmartContract(provider, options.address)
    } else {
      console.log(
        "No address provided, targeting user's address isn't supported yet"
      )
      console.log('User address is', provider.address)
      process.exit(1)
    }

    console.log('Targeting website at address', sc.address)

    const files = await listFiles(sc)
    files.forEach((f) => console.log(f))
  })
