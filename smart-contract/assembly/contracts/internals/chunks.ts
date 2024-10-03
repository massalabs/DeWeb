import { stringToBytes, u32ToBytes } from '@massalabs/as-types';
import { sha256, Storage } from '@massalabs/massa-as-sdk';
import { fileChunkKey } from './storageKeys/chunksKeys';
import { bytesToU32 } from '@massalabs/as-types';
import { fileChunkCountKey } from './storageKeys/chunksKeys';
import { _removeFileLocation } from './location';
import { _removeAllFileMetadata } from './metadata';
/* -------------------------------------------------------------------------- */
/*                                     SET                                    */
/* -------------------------------------------------------------------------- */

/**
 * Sets a chunk of a file in storage.
 * @param location - The location of the file.
 * @param index - The index of the chunk.
 * @param chunk - The chunk data.
 * @throws If the chunk index is not in the expected order.
 */
export function _setFileChunk(
  location: string,
  index: u32,
  chunk: StaticArray<u8>,
): void {
  const hashLocation = sha256(stringToBytes(location));
  const totalChunk = _getTotalChunk(hashLocation);

  assert(totalChunk > 0, "Total chunks wasn't set for this file");
  assert(index < totalChunk, 'Index out of bounds');

  Storage.set(fileChunkKey(hashLocation, index), chunk);
}

/* -------------------------------------------------------------------------- */
/*                                     GET                                    */
/* -------------------------------------------------------------------------- */

/**
 * Retrieves a specific chunk of a file.
 * @param hashLocation - The hash of the file location.
 * @param index - The index of the chunk to retrieve.
 * @returns The chunk data.
 * @throws If the chunk is not found in storage.
 */
export function _getFileChunk(
  hashLocation: StaticArray<u8>,
  index: u32,
): StaticArray<u8> {
  assert(Storage.has(fileChunkKey(hashLocation, index)), 'Chunk not found');
  return Storage.get(fileChunkKey(hashLocation, index));
}

/**
 * Gets the total number of chunks for a file.
 * @param hashLocation - The hash of the file location.
 * @returns The total number of chunks, or 0 if not set.
 */
export function _getTotalChunk(hashLocation: StaticArray<u8>): u32 {
  if (!Storage.has(fileChunkCountKey(hashLocation))) return 0;
  return bytesToU32(Storage.get(fileChunkCountKey(hashLocation)));
}

/* -------------------------------------------------------------------------- */
/*                                   DELETE                                   */
/* -------------------------------------------------------------------------- */

export function _removeChunksRange(
  hashLocation: StaticArray<u8>,
  start: u32 = 0,
  end: u32 = 0,
): void {
  for (let i = u32(start); i < end; i++) {
    Storage.del(fileChunkKey(hashLocation, i));
  }
}

/**
 * Deletes a chunks of a given file from storage.
 * @param hashLocation - The hash of the file location.
 * @throws If the chunk is not found in storage.
 */
export function _deleteFile(hashLocation: StaticArray<u8>): void {
  const chunkNumber = _getTotalChunk(hashLocation);
  for (let i: u32 = 0; i < chunkNumber; i++) {
    assert(
      Storage.has(fileChunkKey(hashLocation, i)),
      'Chunk not found while deleting',
    );
    Storage.del(fileChunkKey(hashLocation, i));
  }

  Storage.del(fileChunkCountKey(hashLocation));

  _removeFileLocation(hashLocation);
  _removeAllFileMetadata(hashLocation);
}

/* -------------------------------------------------------------------------- */
/*                                 CHUNK COUNT                                */
/* -------------------------------------------------------------------------- */

export function _setFileChunkCount(
  hashLocation: StaticArray<u8>,
  totalChunk: u32,
): void {
  Storage.set(fileChunkCountKey(hashLocation), u32ToBytes(totalChunk));
}
