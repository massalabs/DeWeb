import { Command } from '@commander-js/extra-typings'
import { SmartContract } from '@massalabs/massa-web3'
import { readdirSync, readFileSync, statSync } from 'fs'
import { join, relative } from 'path'

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

      console.log('Deployed SC at', sc.address)
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
 * Read every file in the given directory and divide them into chunks
 * @param path - the path to the website directory
 * @param chunkSize - the maximum size of each chunk
 * @param basePath - the base path to compute relative paths (optional)
 */
function prepareChunks(
  path: string,
  chunkSize: number,
  basePath: string = path
): ChunkPost[] {
  const files = readdirSync(path)

  const chunks: ChunkPost[] = []

  for (const file of files) {
    const fullPath = join(path, file)
    const stats = statSync(fullPath)

    if (stats.isDirectory()) {
      // Recursively read the directory
      const directoryChunks = prepareChunks(fullPath, chunkSize, basePath)
      chunks.push(...directoryChunks)
    } else if (stats.isFile()) {
      console.log('Reading file', fullPath)
      const data = readFileSync(fullPath)
      const chunksData = divideIntoChunks(data, chunkSize)

      // Compute the relative path from the base path
      const relativePath = relative(basePath, fullPath)
      const chunkPosts = toChunkPosts(relativePath, chunksData)
      chunks.push(...chunkPosts)
    }
  }

  return chunks
}
