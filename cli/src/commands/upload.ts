import { Command } from '@commander-js/extra-typings'
import {
  Account as KeyPair,
  Mas,
  SmartContract,
  Web3Provider,
} from '@massalabs/massa-web3'
import { readdirSync, readFileSync } from 'fs'
import { deploySC } from '../lib/website/deploySC'
import { uploadChunks } from '../lib/website/uploadChunk'
import { ChunkPost, toChunkPosts } from '../lib/website/chunkPost'
import { divideIntoChunks } from '../lib/website/chunk'
import { batcher } from '../lib/website/batcher'
import { makeProviderFromNodeURLAndSecret } from './utils'

export const uploadCommand = new Command('upload')
  .alias('u')
  .description('Uploads the given website on Massa blockchain')
  .argument('<website_path>', 'Path to the website directory to upload')
  .option('-a, --address <address>', 'Address of the website to edit')
  .action(async (websiteZipFilePath, options, command) => {
    const globalOptions = command.parent?.opts()

    if (!globalOptions) {
      throw new Error(
        'Global options are not defined. This should never happen.'
      )
    }

    const provider = await makeProviderFromNodeURLAndSecret(globalOptions)

    console.log('Provider', provider)

    let sc: SmartContract
    if (options.address) {
      console.log(
        `Editing website at address ${options.address}, no deploy needed`
      )
      sc = new SmartContract(provider, options.address)
    } else {
      console.log('Deploying a new SC')
      sc = await deploySC(provider)
    }

    const chunkSize = 64_000 // 64KB

    const chunks = prepareChunks(websiteZipFilePath, chunkSize)

    const batchedChunks = batcher(chunks, chunkSize)

    for (const batch of batchedChunks) {
      uploadChunks(sc, batch)
    }

    console.log('Done')
  })

/**
 * Read every files in the given directory and divide them into chunks
 * @param path - the path to the website directory
 */
function prepareChunks(path: string, chunkSize: number): ChunkPost[] {
  const files = readdirSync(path, { recursive: true })

  const chunks: ChunkPost[] = []

  for (const file of files) {
    const data = readFileSync(file)
    const chunksData = divideIntoChunks(data, chunkSize)

    const chunkPosts = toChunkPosts(file.toString(), chunksData)
    chunks.push(...chunkPosts)
  }

  return chunks
}
