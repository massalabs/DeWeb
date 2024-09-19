import { readdirSync, readFileSync, statSync } from 'fs'
import { ListrTask } from 'listr2'
import { join, relative } from 'path'

import { batcher } from '../lib/batcher'
import { divideIntoChunks } from '../lib/website/chunk'
import { ChunkPost, toChunkPosts } from '../lib/website/chunkPost'

import { UploadCtx } from './tasks'

/**
 * Create a task to prepare batches from the website file
 * @returns a Listr task to prepare chunks
 */
export function prepareBatchesTask(): ListrTask {
  return {
    title: 'Preparing batches',
    task: async (ctx: UploadCtx, task) => {
      const chunks = prepareChunks(ctx.websiteDirPath, ctx.chunkSize)
      ctx.batches = batcher(chunks, ctx.chunkSize)
      for (const batch of ctx.batches) {
        task.output = `Batch ${batch.id} with ${batch.chunks.length} chunks`
        for (const chunk of batch.chunks) {
          task.output = `  Chunk ${chunk.filePath} ${chunk.chunkId} with ${chunk.data.length} bytes`
        }
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
