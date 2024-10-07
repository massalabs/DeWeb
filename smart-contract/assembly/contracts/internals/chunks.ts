import { stringToBytes, u32ToBytes } from '@massalabs/as-types';
import { sha256, Storage } from '@massalabs/massa-as-sdk';
import { fileChunkKey } from './storageKeys/chunksKeys';
import { bytesToU32 } from '@massalabs/as-types';
import { fileChunkCountKey } from './storageKeys/chunksKeys';
import { _removeFileLocation } from './location';
import { _removeAllFileMetadata } from './metadata';
import { FILE_TAG, CHUNK_TAG } from './storageKeys/tags';
import { fileMetadataLocationKey } from './storageKeys/metadataKeys';
/* -------------------------------------------------------------------------- */
/*                                     SET                                    */
/* -------------------------------------------------------------------------- */

/**
 * Sets a chunk of a file in storage.
 * @param location - The location of the file.
 * @param index - The index of the chunk.
 * @param chunk - The chunk data.
 * @throws If the total chunks weren't set for this file or if the index is out of bounds.
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
 * @returns The chunk data as a StaticArray<u8>.
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

/**
 * Removes a range of chunks for a given file from storage.
 * @param hashLocation - The hash of the file location.
 * @param start - The starting index of the range to remove (inclusive).
 * @param end - The ending index of the range to remove (inclusive).
 */
export function _removeChunksRange(
  hashLocation: StaticArray<u8>,
  start: u32 = 0,
  end: u32 = 0,
): void {
  for (let i = u32(start); i <= end; i++) {
    Storage.del(fileChunkKey(hashLocation, i));
  }
}

/**
 * Deletes all chunks and metadata of a given file from storage.
 * @param hashLocation - The hash of the file location.
 */
export function _deleteFile(hashLocation: StaticArray<u8>): void {
  // Remove all chunks
  const chunkKeys = Storage.getKeys(
    FILE_TAG.concat(hashLocation).concat(CHUNK_TAG),
  );

  for (let i: u32 = 0; i < u32(chunkKeys.length); i++) {
    Storage.del(chunkKeys[i]);
  }

  if (Storage.has(fileChunkCountKey(hashLocation))) {
    Storage.del(fileChunkCountKey(hashLocation));
  }

  if (Storage.has(fileMetadataLocationKey(hashLocation))) {
    _removeFileLocation(hashLocation);
  }

  _removeAllFileMetadata(hashLocation);
}

/* -------------------------------------------------------------------------- */
/*                                 CHUNK COUNT                                */
/* -------------------------------------------------------------------------- */

/**
 * Sets the total number of chunks for a file.
 * @param hashLocation - The hash of the file location.
 * @param totalChunk - The total number of chunks for the file.
 * @throws If the total chunk is less than 1.
 */
export function _setFileChunkCount(
  hashLocation: StaticArray<u8>,
  totalChunk: u32,
): void {
  Storage.set(fileChunkCountKey(hashLocation), u32ToBytes(totalChunk));
}
