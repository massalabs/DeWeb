import { readdirSync, readFileSync, statSync } from 'fs'
import { ListrTask } from 'listr2'
import { posix as path } from 'path'

import { Provider, SmartContract } from '@massalabs/massa-web3'

import { batcher } from '../lib/batcher'

import {
  divideIntoChunks,
  requiresUpdate,
  toChunkPosts,
} from '../lib/website/chunk'
import { listFiles } from '../lib/website/read'

import { FileChunkPost } from '../lib/website/models/FileChunkPost'
import { FileInit } from '../lib/website/models/FileInit'

import { FileDelete } from '../lib/website/models/FileDelete'
import { UploadCtx } from './tasks'
import { filterUselessFileInits } from '../lib/website/filesInit'

/**
 * Create a task to prepare batches from the website file
 * @returns a Listr task to prepare chunks
 */
export function prepareBatchesTask(): ListrTask {
  return {
    title: 'Preparing batches',
    task: async (ctx: UploadCtx, task) => {
      const { chunks, fileInits, localFiles } = await prepareChunks(
        ctx.provider,
        ctx.websiteDirPath,
        ctx.chunkSize,
        ctx.sc
      )

      if (ctx.sc) {
        const {files: filesInSC, notFoundKeys} = await listFiles(ctx.provider, ctx.sc.address)
        if (notFoundKeys.length > 0) {
          throw new Error('Could not retrieve the file location value of some location storage keys: ' + notFoundKeys)
        }
        ctx.filesToDelete = filesInSC
          .filter((file) => !localFiles.includes(file))
          .map((file) => new FileDelete(file))
      }

      ctx.batches = batcher(chunks, ctx.chunkSize)
      ctx.fileInits = ctx.sc
        ? await filterUselessFileInits(ctx.provider, ctx.sc.address, fileInits)
        : fileInits

      if (ctx.batches.length < 16) {
        for (const batch of ctx.batches) {
          task.output = `Batch ${batch.id} with ${batch.chunks.length} chunks`
          for (const chunk of batch.chunks) {
            task.output = `- Chunk ${chunk.location} ${chunk.index} with ${chunk.data.length} bytes`
          }
        }
      }

      task.output = `Total of ${fileInits.length} files, ${ctx.fileInits.length} require update`
      task.output = `${ctx.filesToDelete.length} files will be deleted from the smart contract`
      if (ctx.filesToDelete.length < 16) {
        for (const file of ctx.filesToDelete) {
          task.output = `- ${file.location}`
        }
      }
      task.output = `Total of ${chunks.length} chunks divided into ${ctx.batches.length} batches`
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
}> {
  // init variables
  const files = readdirSync(dirPath)

  const chunks: FileChunkPost[] = []
  const fileInits: FileInit[] = []

  const localFiles: string[] = []

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
    } else if (stats.isFile()) {
      const data = readFileSync(fullPath)
      const relativePath = path.relative(basePath, fullPath)

      localFiles.push(relativePath)

      if (!(await requiresUpdate(provider, relativePath, data, sc?.address))) {
        continue
      }
      const chunksData = divideIntoChunks(data, chunkSize)

      // Compute the relative path from the base path
      const chunkPosts = toChunkPosts(relativePath, chunksData)
      chunks.push(...chunkPosts)

      fileInits.push(new FileInit(relativePath, BigInt(chunkPosts.length)))
    }
  }

  return { chunks, fileInits, localFiles }
}
