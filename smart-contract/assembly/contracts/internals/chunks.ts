import { stringToBytes, bytesToU32, u32ToBytes } from '@massalabs/as-types';
import { sha256, Storage } from '@massalabs/massa-as-sdk';
import { CHUNK_NB_TAG, FILE_TAG, CHUNK_TAG } from './const';
import { _isPathFileInList, _pushFilePath } from './file-list';

/**
 * Sets a chunk of a file in storage.
 * @param filePath - The path of the file.
 * @param id - The index of the chunk.
 * @param chunk - The chunk data.
 * @param totalChunks - The total number of chunks for the file.
 * @throws If the chunk index is greater than or equal to the total number of chunks.
 */
export function _setFileChunk(
  filePath: string,
  id: u32,
  chunk: StaticArray<u8>,
  totalChunks: u32,
): void {
  assert(
    id < totalChunks,
    'Cannot set chunk with index greater or equal than total chunks',
  );

  const filePathHash = sha256(stringToBytes(filePath));

  _updateTotalChunks(filePathHash, totalChunks);
  _storeChunk(filePathHash, id, chunk);
  _updateFilePathList(filePath);
}

/**
 * Updates the total number of chunks for a file.
 * @param filePathHash - The hash of the file path.
 * @param newTotalChunks - The new total number of chunks.
 */
function _updateTotalChunks(
  filePathHash: StaticArray<u8>,
  newTotalChunks: u32,
): void {
  const currentTotalChunks = _getNbChunk(filePathHash);
  if (currentTotalChunks !== newTotalChunks) {
    if (currentTotalChunks > newTotalChunks) {
      // Remove extra chunks
    }
    _setNbChunk(filePathHash, newTotalChunks);
  }
}

/**
 * Stores a chunk in the storage.
 * @param filePathHash - The hash of the file path.
 * @param id - The index of the chunk.
 * @param chunk - The chunk data.
 */
function _storeChunk(
  filePathHash: StaticArray<u8>,
  id: u32,
  chunk: StaticArray<u8>,
): void {
  Storage.set(_getChunkKey(filePathHash, id), chunk);
}

/**
 * Updates the file path list if the file path is not already in the list.
 * @param filePath - The path of the file.
 */
function _updateFilePathList(filePath: string): void {
  if (!_isPathFileInList(filePath)) {
    _pushFilePath(filePath);
  }
}

/**
 * Sets the total number of chunks for a file.
 * @param filePathHash - The hash of the file path.
 * @param totalChunks - The total number of chunks.
 */
function _setNbChunk(filePathHash: StaticArray<u8>, totalChunks: u32): void {
  Storage.set(_getNbChunkKey(filePathHash), u32ToBytes(totalChunks));
}

/**
 * Retrieves a specific chunk of a file.
 * @param filePathHash - The hash of the file path.
 * @param id - The index of the chunk to retrieve.
 * @returns The chunk data.
 * @throws If the chunk is not found in storage.
 */
export function _getFileChunk(
  filePathHash: StaticArray<u8>,
  id: u32,
): StaticArray<u8> {
  assert(Storage.has(_getChunkKey(filePathHash, id)), 'Chunk not found');
  return Storage.get(_getChunkKey(filePathHash, id));
}

/**
 * Gets the total number of chunks for a file.
 * @param filePathHash - The hash of the file path.
 * @returns The total number of chunks, or 0 if not set.
 */
export function _getNbChunk(filePathHash: StaticArray<u8>): u32 {
  if (!Storage.has(_getNbChunkKey(filePathHash))) return 0;
  return bytesToU32(Storage.get(_getNbChunkKey(filePathHash)));
}

/**
 * Generates the storage key for the number of chunks of a file.
 * @param filePathHash - The hash of the file path.
 * @returns The storage key for the number of chunks.
 */
export function _getNbChunkKey(filePathHash: StaticArray<u8>): StaticArray<u8> {
  return CHUNK_NB_TAG.concat(filePathHash);
}

/**
 * Generates the storage key for a specific chunk of a file.
 * @param filePathHash - The hash of the file path.
 * @param id - The index of the chunk.
 * @returns The storage key for the chunk.
 */
export function _getChunkKey(
  filePathHash: StaticArray<u8>,
  id: u32,
): StaticArray<u8> {
  return FILE_TAG.concat(filePathHash).concat(CHUNK_TAG).concat(u32ToBytes(id));
}
