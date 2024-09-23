import { U32 } from '@massalabs/massa-web3'
import { sha256 } from 'js-sha256'

import { storageCostForEntry } from '../utils/storage'

const FILE_TAG = 0
const CHUNK_TAG = 1
const CHUNK_NB_TAG = 2

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
  // Storage of the chunk itself
  let uploadCost = storageCostForEntry(
    getChunkKeyLength(filePath, chunkID),
    chunkSize
  )

  return uploadCost
}

/**
 * Returns the storage key for a chunk from its ID and the file path.
 * @param filePath - the path of the file the chunk belongs to
 * @param chunkID - the ID of the chunk
 * @returns the key full key of the chunk
 */
export function getChunkKey(filePath: string, chunkID: bigint): Uint8Array {
  const filePathHashBuffer = sha256.arrayBuffer(filePath)
  const filePathHashBytes = new Uint8Array(filePathHashBuffer)

  const chunkNumberBytes = U32.toBytes(chunkID)

  const result = new Uint8Array(
    1 + filePathHashBytes.length + 1 + chunkNumberBytes.length
  )

  let offset = 0

  result[offset++] = FILE_TAG

  result.set(filePathHashBytes, offset)
  offset += filePathHashBytes.length

  result[offset++] = CHUNK_TAG

  result.set(chunkNumberBytes, offset)

  return result
}

/**
 * Returns the length of the storage key for a chunk from its ID and the file path.
 * @param filePath - the path of the file the chunk belongs to
 * @param chunkID - the ID of the chunk
 * @returns the length of the chunk key
 */
export function getChunkKeyLength(filePath: string, chunkID: bigint): bigint {
  return BigInt(getChunkKey(filePath, chunkID).length)
}

/**
 * Returns the storage key for the total number of chunks for a file.
 * @param filePath - the path of the file the chunk belongs to
 * @returns the key of the total number of chunks for a file
 */
export function getTotalChunkKey(filePath: string): Uint8Array {
  const filePathHashBuffer = sha256.arrayBuffer(filePath)
  const filePathHashBytes = new Uint8Array(filePathHashBuffer)

  const result = new Uint8Array(1 + filePathHashBytes.length)

  let offset = 0

  result[offset++] = CHUNK_NB_TAG

  result.set(filePathHashBytes, offset)

  return result
}
