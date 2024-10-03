import { Command } from '@commander-js/extra-typings'
import { SmartContract } from '@massalabs/massa-web3'
import { Listr } from 'listr2'

import { deploySCTask } from '../tasks/deploy'
import {
  estimateGasTask,
  recapTask,
  showEstimatedCost,
} from '../tasks/estimations'
import { prepareBatchesTask } from '../tasks/prepareChunk'
import { prepareUploadTask } from '../tasks/prepareUpload'
import { UploadCtx } from '../tasks/tasks'
import { confirmUploadTask, uploadBatchesTask } from '../tasks/upload'

import { makeProviderFromNodeURLAndSecret, validateAddress } from './utils'

export const uploadCommand = new Command('upload')
  .alias('u')
  .description('Uploads the given website on Massa blockchain')
  .argument('<website_path>', 'Path to the website directory to upload')
  .option('-a, --address <address>', 'Address of the website to edit')
  .option('-s, --chunkSize <size>', 'Chunk size in bytes')
  .option('-y, --yes', 'Skip confirmation prompt', false)
  .action(async (websiteDirPath, options, command) => {
    const globalOptions = command.optsWithGlobals()

    const provider = await makeProviderFromNodeURLAndSecret(globalOptions)

    // set chunksize from options or config
    const chunkSize =
      parseInt(options.chunkSize as string) ||
      (globalOptions.chunk_size as number)

    const ctx: UploadCtx = {
      provider: provider,
      batches: [],
      chunks: [],
      preStores: [],
      chunkSize: chunkSize,
      websiteDirPath: websiteDirPath,
      skipConfirm: options.yes,
      currentTotalEstimation: 0n,
      minimalFees: await provider.client.getMinimalFee(),
    }

    if (options.address) {
      const address = options.address
      console.log(`Editing website at address ${address}, no deploy needed`)

      validateAddress(address)

      ctx.sc = new SmartContract(provider, address)
    }

    const tasksArray = [
      prepareBatchesTask(),
      showEstimatedCost(),
      deploySCTask(),
      prepareUploadTask(),
      estimateGasTask(),
      confirmUploadTask(),
      uploadBatchesTask(),
      recapTask(),
    ]

    const tasks = new Listr(tasksArray, {
      concurrent: false,
    })

    try {
      await tasks.run(ctx)
      console.log('Upload complete!')
    } catch (error) {
      console.error('Error during the process:', error)
      process.exit(1)
    }
  })
