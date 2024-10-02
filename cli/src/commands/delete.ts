import { Command } from '@commander-js/extra-typings'
import { SmartContract } from '@massalabs/massa-web3'

import { makeProviderFromNodeURLAndSecret } from './utils'
import { Listr, ListrTask } from 'listr2'
import { DeleteCtx } from '../tasks/tasks'

// Minimal implementation of delete command
export const deleteCommand = new Command('delete')
  .alias('d')
  .description('Delete the given website from Massa blockchain')
  .argument('<address>', 'Address of the website to delete')
  .action(async (address, _, command) => {
    const globalOptions = command.optsWithGlobals()

    if (!globalOptions) {
      throw new Error(
        'Global options are not defined. This should never happen.'
      )
    }

    const provider = await makeProviderFromNodeURLAndSecret(globalOptions)

    const sc = new SmartContract(provider, address)

    const ctx: DeleteCtx = {
      provider: provider,
      sc: sc,
      address: address,
    }

    const tasks = new Listr(deleteWebsiteTask(), {
      concurrent: false,
    })

    try {
      await tasks.run(ctx)
    } catch (error) {
      console.error('Error during the process:', error)
      process.exit(1)
    }
  })

export function deleteWebsiteTask(): ListrTask {
  return {
    title: 'Deleting website',
    task: async (ctx) => {
      // No deleteWebsite in the SC yet
      await deleteWebsite(ctx)
    },
    rendererOptions: {
      outputBar: Infinity,
      persistentOutput: true,
      collapseSubtasks: false,
    },
  }
}

async function deleteWebsite(ctx: DeleteCtx) {
  if (!ctx.sc) {
    throw new Error('Smart contract is not deployed yet')
  }
  ctx.sc
    .call('deleteWebsite', new Uint8Array())
    .then(() => {
      console.log(`Successfully deleted the website at ${ctx.address}`)
    })
    .catch((error) => {
      console.error(error)
    })
}
