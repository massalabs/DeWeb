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
  index: u32,
  chunk: StaticArray<u8>,
): void {
  const filePathHash = sha256(stringToBytes(filePath));
  let totalChunks = _getTotalChunk(filePathHash);

  // Case of a new file or a first chunk of a file update
  if (index === 0) {
    _removeChunks(filePathHash, totalChunks);
    _updateFilePathList(filePath);
    totalChunks = 0;
  }

  // Case of a new chunk we need to check if the index is in the right order
  if (index > 0) {
    assert(
      index === totalChunks,
      `Chunks with non-coherent Index ${index} with totalChunks ${totalChunks}`,
    );
  }

  // Store the chunk and increase the total number of chunks
  _storeChunk(filePathHash, index, chunk);
  _setTotalChunk(filePathHash, totalChunks + 1);
}

function _setTotalChunk(filePathHash: StaticArray<u8>, totalChunks: u32): void {
  Storage.set(_getTotalChunkKey(filePathHash), u32ToBytes(totalChunks));
}

/**
 * Stores a chunk in the storage.
 * @param filePathHash - The hash of the file path.
 * @param id - The index of the chunk.
 * @param chunk - The chunk data.
 */
function _storeChunk(
  filePathHash: StaticArray<u8>,
  index: u32,
  chunk: StaticArray<u8>,
): void {
  Storage.set(_getChunkKey(filePathHash, index), chunk);
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
 * Retrieves a specific chunk of a file.
 * @param filePathHash - The hash of the file path.
 * @param id - The index of the chunk to retrieve.
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
 * @param id - The index of the chunk.
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

export function _removeChunks(
  filePathHash: StaticArray<u8>,
  totalChunks: u32,
): void {
  if (totalChunks == 0) return;

  for (let i = u32(0); i < totalChunks; i++) {
    Storage.del(_getChunkKey(filePathHash, i));
  }
}
