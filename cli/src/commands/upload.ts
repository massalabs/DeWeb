import { Command } from '@commander-js/extra-typings'
import { SmartContract } from '@massalabs/massa-web3'
import { Listr } from 'listr2'

import { listFiles } from '../lib/website/read'
import { deploySCTask } from '../tasks/deploy'
import {
  estimateGasTask,
  showEstimatedCost,
  showTotalEstimatedCost,
} from '../tasks/estimations'
import { prepareBatchesTask } from '../tasks/prepareChunk'
import { UploadCtx } from '../tasks/tasks'
import { confirmUploadTask, uploadBatchesTask } from '../tasks/upload'

import { makeProviderFromNodeURLAndSecret, validateAddress } from './utils'

const DEFAULT_CHUNK_SIZE = 64000n

export const uploadCommand = new Command('upload')
  .alias('u')
  .description('Uploads the given website on Massa blockchain')
  .argument('<website_path>', 'Path to the website directory to upload')
  .option('-a, --address <address>', 'Address of the website to edit')
  .option('-y, --yes', 'Skip confirmation prompt', false)
  .option(
    '-c, --chunk-size <size>',
    'Chunk size in bytes',
    DEFAULT_CHUNK_SIZE.toString()
  )
  .action(async (websiteDirPath, options, command) => {
    const globalOptions = command.parent?.opts()

    if (!globalOptions) {
      throw new Error(
        'Global options are not defined. This should never happen.'
      )
    }

    const provider = await makeProviderFromNodeURLAndSecret(globalOptions)

    const chunkSize = parseInt(options.chunkSize)

    const ctx: UploadCtx = {
      provider: provider,
      batches: [],
      chunks: [],
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
      estimateGasTask(),
      confirmUploadTask(),
      uploadBatchesTask(),
      showTotalEstimatedCost(),
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

    const files = await listFiles(tasks.ctx.sc)
    console.log('Files uploaded:')
    files.forEach((f) => console.log(f))
  })
