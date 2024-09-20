import { stringToBytes, bytesToU32, u32ToBytes } from '@massalabs/as-types';
import { sha256, Storage } from '@massalabs/massa-as-sdk';
import { CHUNK_NB_TAG, FILE_TAG, CHUNK_TAG } from './const';
import { _removeFilePath } from './file-list';

/**
 * Sets a chunk of a file in storage.
 * @param filePath - The path of the file.
 * @param index - The index of the chunk.
 * @param chunk - The chunk data.
 * @throws If the chunk index is not in the expected order.
 */
export function _setFileChunk(
  filePath: string,
  index: u32,
  chunk: StaticArray<u8>,
): void {
  const filePathHash = sha256(stringToBytes(filePath));
  const totalChunks = _getTotalChunk(filePathHash);

  assert(totalChunks > 0, "Total chunks wasn't set for this file");
  assert(index < totalChunks, 'Index out of bounds');

  Storage.set(_getChunkKey(filePathHash, index), chunk);
}

export function _removeChunksRange(
  filePathHash: StaticArray<u8>,
  start: u32 = 0,
  end: u32 = 0,
): void {
  for (let i = u32(start); i < end; i++) {
    Storage.del(_getChunkKey(filePathHash, i));
  }
}

export function _setTotalChunk(
  filePathHash: StaticArray<u8>,
  totalChunks: u32,
): void {
  Storage.set(_getTotalChunkKey(filePathHash), u32ToBytes(totalChunks));
}

/**
 * Retrieves a specific chunk of a file.
 * @param filePathHash - The hash of the file path.
 * @param index - The index of the chunk to retrieve.
 * @returns The chunk data.
 * @throws If the chunk is not found in storage.
 */
export function _getFileChunk(
  filePathHash: StaticArray<u8>,
  index: u32,
): StaticArray<u8> {
  assert(Storage.has(_getChunkKey(filePathHash, index)), 'Chunk not found');
  return Storage.get(_getChunkKey(filePathHash, index));
}

/**
 * Gets the total number of chunks for a file.
 * @param filePathHash - The hash of the file path.
 * @returns The total number of chunks, or 0 if not set.
 */
export function _getTotalChunk(filePathHash: StaticArray<u8>): u32 {
  if (!Storage.has(_getTotalChunkKey(filePathHash))) return 0;
  return bytesToU32(Storage.get(_getTotalChunkKey(filePathHash)));
}

/**
 * Generates the storage key for the number of chunks of a file.
 * @param filePathHash - The hash of the file path.
 * @returns The storage key for the number of chunks.
 */
export function _getTotalChunkKey(
  filePathHash: StaticArray<u8>,
): StaticArray<u8> {
  return CHUNK_NB_TAG.concat(filePathHash);
}

/**
 * Generates the storage key for a specific chunk of a file.
 * @param filePathHash - The hash of the file path.
 * @param index - The index of the chunk.
 * @returns The storage key for the chunk.
 */
export function _getChunkKey(
  filePathHash: StaticArray<u8>,
  index: u32,
): StaticArray<u8> {
  return FILE_TAG.concat(filePathHash)
    .concat(CHUNK_TAG)
    .concat(u32ToBytes(index));
}

export function _removeFile(
  filePath: string,
  filePathHash: StaticArray<u8>,
  newTotalChunks: u32,
): void {
  _removeFilePath(filePath);
  _removeChunksRange(filePathHash, 0, newTotalChunks - 1);
  Storage.del(_getTotalChunkKey(filePathHash));
}
