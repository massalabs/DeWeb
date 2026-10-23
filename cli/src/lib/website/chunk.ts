import { sha256 } from 'js-sha256'

import { fileChunkKey } from './storageKeys'
import { FileChunkPost } from './models/FileChunkPost'
import { StorageCost } from '@massalabs/massa-web3'
import { fileHash } from './metadata'

/**
 * Divide a data array into chunks of a given size.
 * @param data - the data to divide into chunks
 * @param chunkSize - the size of each chunk
 * @returns an array of chunks
 */
export function divideIntoChunks(
  data: Uint8Array,
  chunkSize: number
): Uint8Array[] {
  if (!data || chunkSize <= 0) {
    return []
  }

  const chunks: Uint8Array[] = []

  for (let i = 0; i < data.length; i += chunkSize) {
    const end = Math.min(i + chunkSize, data.length)
    chunks.push(data.slice(i, end))
  }

  return chunks
}

/**
 * Compute the cost of storing a chunk on a website SC.
 *
 * The storage is computed as follows:
 * - The storage of the chunk itself (chunk key length + chunk size)
 *
 * @param filePath - the path of the file the chunk belongs to
 * @param chunkID - the ID of the chunk
 * @param chunkSize - the size of the chunk
 * @returns the cost of storing the chunk
 *
 * @remarks The chunk is always a new entry: the SC deletes the previous data of
 * a file when initializing it, and refunds the freed storage at that point.
 */
export function computeChunkCost(
  filePath: string,
  chunkID: bigint,
  chunk: Uint8Array
): bigint {
  // Storage of the chunk itself
  let uploadCost = StorageCost.datastoreEntry(
    fileChunkKey(fileHash(filePath), chunkID),
    chunk
  )

  return uploadCost
}

/**
 * Convert an array of chunks into an array of FileChunkPost.
 * @param filepath - the path of the file the chunks belong to
 * @param chunks - the chunks to convert
 * @returns an array of FileChunkPost
 */
export function toChunkPosts(
  filepath: string,
  chunks: Uint8Array[]
): FileChunkPost[] {
  return chunks.map((chunk, index) => {
    return new FileChunkPost(filepath, BigInt(index), chunk)
  })
}

/**
 * Check if the file requires update
 * @param localFileContent - the local file content
 * @param onChainFileContent - the content stored on chain, if any
 * @returns true if the file requires update, false otherwise
 */
export function requiresUpdate(
  localFileContent: Uint8Array,
  onChainFileContent?: Uint8Array
): boolean {
  if (localFileContent.length === 0) {
    return false
  }

  if (!onChainFileContent) {
    return true
  }

  if (onChainFileContent.length !== localFileContent.length) {
    return true
  }

  const localFileHash = sha256(localFileContent)
  const onChainFileHash = sha256(onChainFileContent)

  return localFileHash !== onChainFileHash
}
