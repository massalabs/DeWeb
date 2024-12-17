import { sha256 } from 'js-sha256'

import { storageCostForEntry } from '../utils/storage'
import { fileChunkKey } from './storageKeys'
import { FileChunkPost } from './models/FileChunkPost'
import { getFileFromAddress } from './read'
import { Provider } from '@massalabs/massa-web3'

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
 * @remarks This function should be updated to avoid sending coins for chunks that do not require it:
 * - chunk X in storage has the same size or less, we do not need to send coins for it.
 * - if the chunk ID is already in storage, we do not need to pay new ledger entry cost.
 */
export function computeChunkCost(
  filePath: string,
  chunkID: bigint,
  chunkSize: bigint
): bigint {
  const filePathHash = sha256.arrayBuffer(filePath)
  const filePathHashBytes = new Uint8Array(filePathHash)

  // Storage of the chunk itself
  let uploadCost = storageCostForEntry(
    BigInt(fileChunkKey(filePathHashBytes, chunkID).length),
    chunkSize
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
 * @param provider - the web3 provider
 * @param location - the file path
 * @param localFileContent - the local file content
 * @param sc - the smart contract
 * @returns true if the file requires update, false otherwise
 */
export async function requiresUpdate(
  provider: Provider,
  location: string,
  localFileContent: Uint8Array,
  scAddress?: string
): Promise<boolean> {
  if (localFileContent.length === 0) {
    return false
  }

  if (!scAddress || !scAddress.length) {
    return true
  }

  var onChainFileContent: Uint8Array
  try {
    onChainFileContent = await getFileFromAddress(provider, scAddress, location)
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
