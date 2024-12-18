import { Command } from '@commander-js/extra-typings'
import { SmartContract } from '@massalabs/massa-web3'

import { getFileFromAddress } from '../lib/website/read'

import { makeProviderFromNodeURLAndSecret, validateAddress } from './utils'

export const showFileCommand = new Command('show')
  .description('Lists files from the given website on Massa blockchain')
  .argument('<file_path>', 'Path of the file to show')
  .option('-a, --address <address>', 'Address of the website to edit')
  .action(async (filePath, options, command) => {
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

    const fileContent = await getFileFromAddress(provider, sc.address, filePath)
    const fileContentString = Array.from(new Uint8Array(fileContent))
      .map((byte) => String.fromCharCode(byte))
      .join('')

    console.log(fileContentString)
  })
