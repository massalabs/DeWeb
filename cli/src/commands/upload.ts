import { Command } from '@commander-js/extra-typings'
import { SmartContract, Web3Provider } from '@massalabs/massa-web3'
import { Listr } from 'listr2'

import { deploySCTask } from '../tasks/deploy'
import { recapTask, showEstimatedCost } from '../tasks/estimations'
import { prepareBatchesTask } from '../tasks/prepareChunk'
import { prepareUploadTask } from '../tasks/prepareUpload'
import { UploadCtx } from '../tasks/tasks'
import { confirmUploadTask, uploadBatchesTask } from '../tasks/upload'

import {
  filterMetadataToUpdate,
  getGlobalMetadata,
} from '../lib/website/metadata'
import { makeProviderFromNodeURLAndSecret } from './utils'
import { loadConfig } from './config'
import { isImmutable } from '../lib/website/immutable'

export const uploadCommand = new Command('upload')
  .alias('u')
  .description('Uploads the given website on Massa blockchain')
  .argument('<website_path>', 'Path to the website directory to upload')
  .option('-a, --address <address>', 'Address of the website to edit')
  .option('-s, --chunkSize <size>', 'Chunk size in bytes')
  .option('-y, --yes', 'Skip confirmation prompt', false)
  .option('--noIndex', 'Skip DeWeb index update', false)
  .option(
    '--skip-index-html-check',
    'Skip the check for index.html. Use if you really want to publish a non working website',
    false
  )
  .action(async (websiteDirPath, options, command) => {
    const globalOptions = loadConfig(command.optsWithGlobals())

    const provider = await makeProviderFromNodeURLAndSecret(globalOptions)

    const ctx: UploadCtx = await createUploadCtx(
      provider,
      globalOptions.chunk_size,
      websiteDirPath,
      options.yes,
      options.noIndex,
      options.skipIndexHtmlCheck
    )

    const newMetadatas = globalOptions.metadatas ?? []

    // if we edit an already deployed website
    if (globalOptions.address) {
      const address = globalOptions.address
      console.log(`Editing website at address ${address}, no deploy needed`)

      const isimmutable = await isImmutable(
        address,
        globalOptions.node_url,
        true
      )
      if (isimmutable) {
        console.error(
          `The website at address ${address} is immutable. It cannot be edited anymore.`
        )
        process.exit(1)
      }

      ctx.sc = new SmartContract(provider, address)

      const currentGlobalMetadata = await getGlobalMetadata(provider, address)

      const updateRequired = await filterMetadataToUpdate(
        currentGlobalMetadata,
        newMetadatas
      )

      ctx.metadatas.push(...updateRequired)
    } else {
      ctx.metadatas.push(...newMetadatas)
    }

    const tasksArray = [
      prepareBatchesTask(),
      showEstimatedCost(),
      deploySCTask(),
      prepareUploadTask(),
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

async function createUploadCtx(
  provider: Web3Provider,
  chunkSize: number,
  websiteDirPath: string,
  skipConfirm: boolean,
  noIndex: boolean,
  skipIndexHtmlCheck: boolean
): Promise<UploadCtx> {
  return {
    provider: provider,
    batches: [],
    chunks: [],
    fileInits: [],
    filesToDelete: [],
    metadatas: [],
    metadatasToDelete: [],
    chunkSize: chunkSize,
    websiteDirPath: websiteDirPath,
    skipConfirm: skipConfirm,
    noIndex: noIndex,
    skipIndexHtmlCheck: skipIndexHtmlCheck,
    currentTotalEstimation: 0n,
    maxConcurrentOps: 4,
    minimalFees: await provider.client.getMinimalFee(),
  }
}
