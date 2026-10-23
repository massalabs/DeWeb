import { readdirSync, readFileSync, statSync } from 'fs'
import { ListrTask } from 'listr2'
import { posix as path } from 'path'

import { Provider, SmartContract, U64 } from '@massalabs/massa-web3'

import { batcher } from '../lib/batcher'

import {
  divideIntoChunks,
  requiresUpdate,
  toChunkPosts,
} from '../lib/website/chunk'
import { LAST_UPDATE_KEY } from '../lib/website/metadata'
import { getOnChainFile, listFiles } from '../lib/website/read'

import { FileChunkPost } from '../lib/website/models/FileChunkPost'
import { FileInit } from '../lib/website/models/FileInit'

import { FileDelete } from '../lib/website/models/FileDelete'
import { Metadata } from '../lib/website/models/Metadata'
import { UploadCtx } from './tasks'

/**
 * Create a task to prepare batches from the website file
 * @returns a Listr task to prepare chunks
 */
export function prepareBatchesTask(): ListrTask {
  return {
    title: 'Preparing batches',
    task: async (ctx: UploadCtx, task) => {
      const { chunks, fileInits, localFiles, replacedStorageCost } =
        await prepareChunks(
          ctx.provider,
          ctx.websiteDirPath,
          ctx.chunkSize,
          ctx.sc
        )
      ctx.fileInits = fileInits
      ctx.freedStorageCost = replacedStorageCost

      // check that the provided website directory has correct format
      if (!ctx.skipIndexHtmlCheck && !localFiles.includes('index.html')) {
        throw new Error("Missing 'index.html' in the source directory.")
      }

      // If the smart contract is already deployed
      if (ctx.sc) {
        // Retreive all the files in the smart contract
        const { files: filesInSC, notFoundKeys } = await listFiles(
          ctx.provider,
          ctx.sc.address
        )
        if (notFoundKeys.length > 0) {
          throw new Error(
            'Could not retrieve the file location value of some location storage keys: ' +
              notFoundKeys
          )
        }
        ctx.filesToDelete = filesInSC
          .filter((file) => !localFiles.includes(file))
          .map((file) => new FileDelete(file))

        // Storage freed by deleting the files
        for (const file of ctx.filesToDelete) {
          const onChainFile = await getOnChainFile(
            ctx.provider,
            ctx.sc.address,
            file.location
          )
          ctx.freedStorageCost += onChainFile?.storageCost ?? 0n
        }
      }

      ctx.batches = batcher(chunks, ctx.chunkSize)

      // Stamp the website with its update time whenever something changes.
      // Done here, before the cost estimation, so that it is accounted for.
      if (
        ctx.fileInits.length !== 0 ||
        ctx.filesToDelete.length !== 0 ||
        ctx.metadatas.length !== 0 ||
        ctx.metadatasToDelete.length !== 0
      ) {
        const utcNowDate = U64.fromNumber(Math.floor(Date.now() / 1000))
        ctx.metadatas.push(new Metadata(LAST_UPDATE_KEY, utcNowDate.toString()))
      }

      if (ctx.batches.length < 16) {
        for (const batch of ctx.batches) {
          task.output = `Batch ${batch.id} with ${batch.chunks.length} chunks`
          for (const chunk of batch.chunks) {
            task.output = `- Chunk ${chunk.location} ${chunk.index} with ${chunk.data.length} bytes`
          }
        }
      }

      task.output = `Total of ${localFiles.length} files, ${fileInits.length} require update`
      task.output = `${ctx.filesToDelete.length} files will be deleted from the smart contract`
      if (ctx.filesToDelete.length < 16) {
        for (const file of ctx.filesToDelete) {
          task.output = `- ${file.location}`
        }
      }
      if (ctx.batches.length) {
        task.output = `Total of ${chunks.length} chunks divided into ${ctx.batches.length} batches`
      }
    },
    rendererOptions: {
      outputBar: Infinity,
      persistentOutput: true,
    },
  }
}

/**
 * Read every file in the given directory and divide them into chunks
 * @param path - the path to the website directory
 * @param chunkSize - the maximum size of each chunk
 * @param basePath - the base path to compute relative paths (optional)
 * @returns the chunks and file inits of the files to upload, the local files,
 * and the storage cost of the on-chain files they replace (the SC frees it)
 */
async function prepareChunks(
  provider: Provider,
  dirPath: string,
  chunkSize: number,
  sc?: SmartContract,
  basePath: string = dirPath
): Promise<{
  chunks: FileChunkPost[]
  fileInits: FileInit[]
  localFiles: string[]
  replacedStorageCost: bigint
}> {
  // init variables
  const files = readdirSync(dirPath)

  const chunks: FileChunkPost[] = []
  const fileInits: FileInit[] = []

  const localFiles: string[] = []
  let replacedStorageCost = 0n

  // iterate over the files
  for (const file of files) {
    const fullPath = path.join(dirPath, file)
    const stats = statSync(fullPath)

    if (stats.isDirectory()) {
      // Recursively read the directory
      const result = await prepareChunks(
        provider,
        fullPath,
        chunkSize,
        sc,
        basePath
      )
      chunks.push(...result.chunks)
      fileInits.push(...result.fileInits)
      localFiles.push(...result.localFiles)
      replacedStorageCost += result.replacedStorageCost
    } else if (stats.isFile()) {
      const data = readFileSync(fullPath)
      const relativePath = path.relative(basePath, fullPath)

      localFiles.push(relativePath)

      const onChainFile = sc
        ? await getOnChainFile(provider, sc.address, relativePath)
        : undefined

      if (!requiresUpdate(data, onChainFile?.content)) {
        continue
      }
      replacedStorageCost += onChainFile?.storageCost ?? 0n
      const chunksData = divideIntoChunks(data, chunkSize)

      // Compute the relative path from the base path
      const chunkPosts = toChunkPosts(relativePath, chunksData)
      chunks.push(...chunkPosts)

      fileInits.push(new FileInit(relativePath, BigInt(chunkPosts.length)))
    }
  }

  return { chunks, fileInits, localFiles, replacedStorageCost }
}
