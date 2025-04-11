import { Command } from '@commander-js/extra-typings'
import { SmartContract } from '@massalabs/massa-web3'
import { Listr } from 'listr2'

import {
  confirmDeleteWebsiteTask,
  confirmPurgeWebsiteTask,
  deleteWebsiteTask,
  prepareDeleteWebsiteTask,
  purgeWebsiteTask,
} from '../tasks/delete'
import { DeleteCtx } from '../tasks/tasks'

import { makeProviderFromNodeURLAndSecret } from './utils'
import { loadConfig } from './config'

export const deleteCommand = new Command('delete')
  .alias('d')
  .description('Delete the given website from Massa blockchain')
  .argument('<address>', 'Address of the website to delete')
  .option('-y, --yes', 'Skip confirmation prompt', false)
  .option(
    '--purge',
    'Also delete the Smart Contract from the blockchain',
    false
  )
  .action(async (address, options, command) => {
    const globalOptions = loadConfig(command.optsWithGlobals())

    const provider = await makeProviderFromNodeURLAndSecret(globalOptions)

    const sc = new SmartContract(provider, address)

    const ctx: DeleteCtx = {
      sc: sc,

      fileDeletes: [],
      globalMetadatas: [],

      skipConfirm: options.yes,
      purge: options.purge,
    }

    const tasksArray = [
      prepareDeleteWebsiteTask(),
      confirmDeleteWebsiteTask(),
      deleteWebsiteTask(),
    ]

    if (options.purge) {
      tasksArray.push(confirmPurgeWebsiteTask(), purgeWebsiteTask())
    }

    const tasks = new Listr(tasksArray, {
      concurrent: false,
    })

    try {
      await tasks.run(ctx)
    } catch (error) {
      console.error('Error during the process:', error)
      process.exit(1)
    }
  })
