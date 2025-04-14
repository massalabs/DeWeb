import { Command } from '@commander-js/extra-typings'
import { bytesToStr } from '@massalabs/massa-web3'

import { getFileFromAddress } from '../lib/website/read'

import { initPublicProvider } from './utils'
import { loadConfig } from './config'

export const showFileCommand = new Command('show')
  .description('Show a file from the given website on Massa blockchain')
  .argument('<file_path>', 'Path of the file to show')
  .option('-a, --address <address>', 'Address of the website to edit')
  .action(async (filePath, options, command) => {
    const globalOptions = loadConfig({
      ...command.optsWithGlobals(),
      address: options.address,
    })

    if (!globalOptions.address) {
      throw new Error('No address provided')
    }

    const provider = await initPublicProvider(globalOptions)

    console.log('Targeting website at address', globalOptions.address)

    const fileContent = await getFileFromAddress(
      provider,
      globalOptions.address,
      filePath
    )
    const fileContentString = bytesToStr(fileContent)
    console.log(fileContentString)
  })
