import { Command } from '@commander-js/extra-typings'
import { SmartContract } from '@massalabs/massa-web3'

import { listFiles } from '../lib/website/read'

import { makeProviderFromNodeURLAndSecret, validateAddress } from './utils'

export const listFilesCommand = new Command('list')
  .alias('ls')
  .description('Lists files from the given website on Massa blockchain')
  .option('-a, --address <address>', 'Address of the website to list')
  .action(async (options, command) => {
    const globalOptions = command.optsWithGlobals()

    const provider = await makeProviderFromNodeURLAndSecret(globalOptions)

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

    const {files, notFoundKeys} = await listFiles(provider, sc.address)
    console.log(`Total of ${files.length} files:`)
    files.sort().forEach((f) => console.log(f))
    if (notFoundKeys.length > 0) {
      console.error('Could not retrieve the file location value of some location storage keys: ', notFoundKeys)
    }
  })
