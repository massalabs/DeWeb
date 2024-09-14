import { Command } from '@commander-js/extra-typings'
import { SmartContract } from '@massalabs/massa-web3'

import { makeProviderFromNodeURLAndSecret } from './utils'

export const deleteCommand = new Command('delete')
  .alias('d')
  .description('Delete the given website from Massa blockchain')
  .argument('<address>', 'Address of the website to delete')
  .action(async (websiteZipFilePath, _, command) => {
    const globalOptions = command.parent?.opts()

    if (!globalOptions) {
      throw new Error(
        'Global options are not defined. This should never happen.'
      )
    }

    const provider = await makeProviderFromNodeURLAndSecret(globalOptions)

    // Placeholder for the deploy action
    console.log(
      `Deleting ${websiteZipFilePath} with config ${globalOptions.config} and node URL ${globalOptions.node_url}`
    )

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const sc = new SmartContract(provider, websiteZipFilePath)

    console.error('deleteWebsite not implemented yet in the SC')

    // No deleteWebsite in the SC yet

    // sc.call('deleteWebsite', new Uint8Array())
    //   .then((result) => {
    //     console.log(result)
    //   })
    //   .catch((error) => {
    //     console.error(error)
    //   })
  })
