import { Command } from '@commander-js/extra-typings'
import { bytesToStr } from '@massalabs/massa-web3'

import { getFileFromAddress } from '../lib/website/read'

import { makeProviderFromNodeURLAndSecret, validateAddress } from './utils'

export const showFileCommand = new Command('show')
  .description('Show a file from the given website on Massa blockchain')
  .argument('<file_path>', 'Path of the file to show')
  .option('-a, --address <address>', 'Address of the website to edit')
  .action(async (filePath, options, command) => {
    const globalOptions = command.optsWithGlobals()

    const provider = await makeProviderFromNodeURLAndSecret(globalOptions)

    if (options.address) {
      validateAddress(options.address)
    } else {
      console.log(
        "No address provided, targeting user's address isn't supported yet"
      )
      console.log('User address is', provider.address)
      process.exit(1)
    }

    console.log('Targeting website at address', options.address)

    const fileContent = await getFileFromAddress(
      provider,
      options.address,
      filePath
    )
    const fileContentString = bytesToStr(fileContent)
    console.log(fileContentString)
  })
