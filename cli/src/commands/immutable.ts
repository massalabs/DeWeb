import { Command } from '@commander-js/extra-typings'
import { makeImmutable } from '@massalabs/massa-web3'
import { makeProviderFromNodeURLAndSecret, exitIfImmutable } from './utils'
import { promptYesNo } from '../tasks/utils'
import { loadConfig } from './config'

/* Make a website immutable */
export const immutableCommand = new Command('immutable')
  .description('Make a given website on Massa blockchain immutable')
  .argument(
    '<address>',
    'Address of the smart contract of the website to make immutable'
  )
  .option('-y, --yes', 'Skip confirmation prompt')
  .action(async (address, _, command) => {
    const globalOptions = loadConfig({ ...command.optsWithGlobals() })

    if (!address) {
      throw new Error('No address provided')
    }

    const provider = await makeProviderFromNodeURLAndSecret(globalOptions)

    await exitIfImmutable(
      address,
      provider,
      `The website at address ${address} is already immutable.`
    )

    if (
      !command.opts().yes &&
      !(await promptYesNo(
        `\nAre you sure you want to make the website at address ${address} immutable ? \n` +
          'This action is irreversible. No one will be able to update the website anymore not even you.'
      ))
    ) {
      console.error('immutable command aborted by user')
      process.exit(0)
    }

    console.log(`Making the website at address ${address} immutable...`)

    try {
      await makeImmutable(
        address,
        provider,
        true // Wait final execution because it's a critical operation
      )

      console.log(
        `Operation finalized. The website at address ${address} is now immutable.`
      )
    } catch (err) {
      throw new Error(`Failed to make the website immutable: ${err}`)
    }
  })
