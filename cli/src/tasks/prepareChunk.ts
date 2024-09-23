import { readdirSync, readFileSync, statSync } from 'fs'
import { sha256 } from 'js-sha256'
import { ListrTask } from 'listr2'
import { join, relative } from 'path'

import { batcher } from '../lib/batcher'
import { divideIntoChunks, getTotalChunkKey } from '../lib/website/chunk'
import { ChunkPost, toChunkPosts } from '../lib/website/chunkPost'
import { PreStore } from '../lib/website/preStore'

import { SmartContract, U32, Web3Provider } from '@massalabs/massa-web3'
import { getFileFromAddress } from '../lib/website/read'
import { UploadCtx } from './tasks'

/**
 * Create a task to prepare batches from the website file
 * @returns a Listr task to prepare chunks
 */
export function prepareBatchesTask(): ListrTask {
  return {
    title: 'Preparing batches',
    task: async (ctx: UploadCtx, task) => {
      const { chunks, preStores } = await prepareChunks(
        ctx.provider,
        ctx.websiteDirPath,
        ctx.chunkSize,
        ctx.sc
      )
      ctx.batches = batcher(chunks, ctx.chunkSize)
      ctx.preStores = ctx.sc
        ? await filterUselessPreStores(ctx.provider, ctx.sc.address, preStores)
        : preStores

      if (ctx.batches.length < 16) {
        for (const batch of ctx.batches) {
          task.output = `Batch ${batch.id} with ${batch.chunks.length} chunks`
          for (const chunk of batch.chunks) {
            task.output = `- Chunk ${chunk.filePath} ${chunk.chunkId} with ${chunk.data.length} bytes`
          }
        }
      }

      task.output = `Total of ${preStores.length} files, only ${ctx.preStores.length} require update`
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
  provider: Web3Provider,
  path: string,
  chunkSize: number,
  sc?: SmartContract,
  basePath: string = path
): Promise<{ chunks: ChunkPost[]; preStores: PreStore[] }> {
  const files = readdirSync(path)

  const chunks: ChunkPost[] = []
  const preStores: PreStore[] = []

  for (const file of files) {
    const fullPath = join(path, file)
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
      preStores.push(...result.preStores)
    } else if (stats.isFile()) {
      const data = readFileSync(fullPath)
      const relativePath = relative(basePath, fullPath)

      if (!(await requiresUpdate(provider, relativePath, data, sc))) {
        continue
      }
      const chunksData = divideIntoChunks(data, chunkSize)

      // Compute the relative path from the base path
      const chunkPosts = toChunkPosts(relativePath, chunksData)
      chunks.push(...chunkPosts)

      preStores.push(
        new PreStore(
          relativePath,
          new Uint8Array(sha256.arrayBuffer(relativePath)),
          BigInt(chunkPosts.length)
        )
      )
    }
  }

  return { chunks, preStores }
}

async function requiresUpdate(
  provider: Web3Provider,
  filePath: string,
  localFileContent: Uint8Array,
  sc?: SmartContract
): Promise<boolean> {
  if (localFileContent.length === 0) {
    return false
  }

  if (!sc) {
    return true
  }

  var onChainFileContent: Uint8Array
  try {
    onChainFileContent = await getFileFromAddress(provider, sc, filePath)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_) {
    return true
  }

  if (onChainFileContent.length !== localFileContent.length) {
    return true
  }

  const localFileHash = sha256(localFileContent)
  const onChainFileHash = sha256(onChainFileContent)

  return localFileHash !== onChainFileHash
}

async function filterUselessPreStores(
  provider: Web3Provider,
  scAddress: string,
  preStores: PreStore[]
): Promise<PreStore[]> {
  const preStoresWithKey = preStores.map((preStore) => {
    return {
      preStore: preStore,
      totalChunkKey: getTotalChunkKey(preStore.filePath),
    }
  })

  const batches: {
    preStore: PreStore
    totalChunkKey: Uint8Array
  }[][] = []

  for (let i = 0; i < preStoresWithKey.length; i += 100) {
    batches.push(preStoresWithKey.slice(i, i + 100))
  }

  const preStoresToKeep: PreStore[] = []

  for (const batch of batches) {
    // TODO: Could be improved by first checking if keys exist
    const results = await provider.client.getDatastoreEntries(
      batch.map((key) => {
        return {
          address: scAddress,
          key: key.totalChunkKey,
        }
      })
    )

    for (let i = 0; i < batch.length; i++) {
      if (
        results[i].length !== U32.SIZE_BYTE ||
        U32.fromBytes(results[i]) !== batch[i].preStore.newTotalChunks
      ) {
        preStoresToKeep.push(batch[i].preStore)
      }
    }
  }

  return preStoresToKeep
}
