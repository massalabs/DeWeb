import { readdirSync, readFileSync, statSync } from 'fs'
import { sha256 } from 'js-sha256'
import { ListrTask } from 'listr2'
import { posix as path } from 'path'

import { Provider, SmartContract, U32 } from '@massalabs/massa-web3'

import { batcher } from '../lib/batcher'

import { divideIntoChunks, toChunkPosts } from '../lib/website/chunk'
import { getFileFromAddress, listFiles } from '../lib/website/read'
import { FILE_TAG, fileChunkCountKey } from '../lib/website/storageKeys'

import { FileChunkPost } from '../lib/website/models/FileChunkPost'
import { FileInit } from '../lib/website/models/FileInit'

import { FileDelete } from '../lib/website/models/FileDelete'
import { UploadCtx } from './tasks'

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
        const filesInSC = await listFiles(ctx.provider, ctx.sc)
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
  const files = readdirSync(dirPath)

  const chunks: FileChunkPost[] = []
  const fileInits: FileInit[] = []

  const localFiles: string[] = []

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

      if (!(await requiresUpdate(provider, relativePath, data, sc))) {
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

/**
 * Check if the file requires update
 * @param provider - the web3 provider
 * @param location - the file path
 * @param localFileContent - the local file content
 * @param sc - the smart contract
 * @returns true if the file requires update, false otherwise
 */
async function requiresUpdate(
  provider: Provider,
  location: string,
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
    onChainFileContent = await getFileFromAddress(provider, sc, location)
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

/**
 * Filter out pre-stores that are already stored on the blockchain
 * @param provider - the web3 provider
 * @param scAddress - the smart contract address
 * @param fileInits - the pre-stores to filter
 * @returns the pre-stores that are not stored on the blockchain
 */
async function filterUselessFileInits(
  provider: Provider,
  scAddress: string,
  fileInits: FileInit[]
): Promise<FileInit[]> {
  const fileInitsWithKey = fileInits.map((preStore) => {
    return {
      preStore: preStore,
      totalChunkKey: fileChunkCountKey(preStore.hashLocation),
    }
  })

  const batches: {
    preStore: FileInit
    totalChunkKey: Uint8Array
  }[][] = []

  for (let i = 0; i < fileInitsWithKey.length; i += 100) {
    batches.push(fileInitsWithKey.slice(i, i + 100))
  }

  const fileInitsToKeep: FileInit[] = []

  for (const batch of batches) {
    const keys = await provider.getStorageKeys(scAddress, FILE_TAG)

    // Remove missing keys from the batch and add them to the list of files to keep
    for (let i = batch.length - 1; i >= 0; i--) {
      if (!keys.includes(batch[i].totalChunkKey)) {
        fileInitsToKeep.push(batch[i].preStore)
        batch.splice(i, 1)
      }
    }

    const results = await provider.readStorage(
      scAddress,
      batch.map((key) => key.totalChunkKey)
    )

    for (let i = 0; i < batch.length; i++) {
      if (
        results[i].length !== U32.SIZE_BYTE ||
        U32.fromBytes(results[i]) !== batch[i].preStore.totalChunk
      ) {
        fileInitsToKeep.push(batch[i].preStore)
      }
    }
  }

  return fileInitsToKeep
}
