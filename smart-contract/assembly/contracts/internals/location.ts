import { stringToBytes } from '@massalabs/as-types';
import { Storage } from '@massalabs/massa-as-sdk';
import { fileLocationKey } from './storageKeys/metadataKeys';

/**
 * Adds a new file location to the list of file locations.
 * @param location - The file location to be added.
 * @param hashLocation - The hash of the file location.
 */
export function _pushFileLocation(
  location: string,
  hashLocation: StaticArray<u8>,
): void {
  Storage.set(fileLocationKey(hashLocation), stringToBytes(location));
}

/**
 * Removes a file location from the list of file locations.
 * If the file location is not in the list, this function throws an error.
 * @param hashLocation - The hash of the file location to be removed.
 * @throws If the file location is not found.
 */
export function _removeFileLocation(hashLocation: StaticArray<u8>): void {
  const key = fileLocationKey(hashLocation);
  assert(Storage.has(key), 'File not found');
  Storage.del(key);
}
