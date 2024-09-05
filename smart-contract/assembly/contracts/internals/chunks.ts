import { stringToBytes, bytesToU32, u32ToBytes } from '@massalabs/as-types';
import { generateEvent, sha256, Storage } from '@massalabs/massa-as-sdk';
import { CHUNK_NB_TAG, FILE_TAG, CHUNK_TAG } from '../utils/const';
import { _isPathFileInList, _pushFilePath } from './file-list';
import { _verifyStorageValueSize } from './helpers';

// SETTERS
export function _setFileChunk(
  filePath: string,
  chunkIndex: u32,
  chunk: StaticArray<u8>,
  totalChunks: u32,
): void {
  _verifyStorageValueSize(chunk);

  const filePathHash = sha256(stringToBytes(filePath));

  // Check if we update a file with a different number of chunks
  _verifyTotalChunks(filePathHash, totalChunks);

  Storage.set(_getChunkKey(filePathHash, chunkIndex), chunk);

  if (!_isPathFileInList(filePath)) {
    _pushFilePath(filePath);
  }

  generateEvent(`ChunkStored: ${filePath} ${chunkIndex}`);
}

function _setNbChunk(filePathHash: StaticArray<u8>, totalChunks: u32): void {
  Storage.set(_getNbChunkKey(filePathHash), u32ToBytes(totalChunks));
}

// GETTERS
export function _getFileChunk(
  filePathHash: StaticArray<u8>,
  chunkIndex: u32,
): StaticArray<u8> {
  assert(
    Storage.has(_getChunkKey(filePathHash, chunkIndex)),
    'Chunk not found',
  );
  return Storage.get(_getChunkKey(filePathHash, chunkIndex));
}

export function _getNbChunk(filePathHash: StaticArray<u8>): u32 {
  if (!Storage.has(_getNbChunkKey(filePathHash))) return 0;
  return bytesToU32(Storage.get(_getNbChunkKey(filePathHash)));
}

// KEYS
export function _getNbChunkKey(filePathHash: StaticArray<u8>): StaticArray<u8> {
  // filePÄth should be a hash
  return stringToBytes(`${CHUNK_NB_TAG}${filePathHash.toString()}`);
}

export function _getChunkKey(
  filePathHash: StaticArray<u8>,
  chunkIndex: u32,
): StaticArray<u8> {
  // should we use this or directly have parameters as bytes?
  return stringToBytes(
    `${FILE_TAG}${filePathHash.toString()}${CHUNK_TAG}${chunkIndex}`,
  );
}

// HELPERS
export function _verifyTotalChunks(
  filePathHash: StaticArray<u8>,
  totalChunks: u32,
): void {
  const nbChunk = _getNbChunk(filePathHash);
  if (nbChunk !== totalChunks) {
    if (nbChunk > totalChunks) {
      // TODO - Delete chunks
    }
    _setNbChunk(filePathHash, totalChunks);
  }
}
