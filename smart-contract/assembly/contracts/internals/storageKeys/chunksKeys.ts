import { u32ToBytes } from '@massalabs/as-types';
import { CHUNK_NB_TAG, FILE_TAG, CHUNK_TAG } from './tags';

/**
 * Generates the storage key for the number of chunks of a file.
 * @param hashLocation - The hash of the file location.
 * @returns The storage key for the number of chunks as a StaticArray<u8>.
 *
 * @remarks
 * Storage representation: [FILE_TAG][hash(location)][CHUNK_NB_TAG] = chunk_count_value
 */
export function fileChunkCountKey(
  hashLocation: StaticArray<u8>,
): StaticArray<u8> {
  return FILE_TAG.concat(hashLocation).concat(CHUNK_NB_TAG);
}

/**
 * Generates the storage key prefix for a specific chunk of a file.
 * @param hashLocation - The hash of the file location.
 * @returns The storage key prefix for the chunk as a StaticArray<u8>.
 */
export function fileChunkKeyPrefix(
  hashLocation: StaticArray<u8>,
): StaticArray<u8> {
  return FILE_TAG.concat(hashLocation).concat(CHUNK_TAG);
}

/**
 * Generates the storage key for a specific chunk of a file.
 * @param hashLocation - The hash of the file location.
 * @param index - The index of the chunk.
 * @returns The storage key for the chunk as a StaticArray<u8>.
 *
 * @remarks
 * Storage representation: [FILE_TAG][hash(location)][CHUNK_TAG][index] = chunk_data
 */
export function fileChunkKey(
  hashLocation: StaticArray<u8>,
  index: u32,
): StaticArray<u8> {
  return fileChunkKeyPrefix(hashLocation).concat(u32ToBytes(index));
}
