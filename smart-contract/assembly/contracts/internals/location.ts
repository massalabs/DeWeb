import { bytesToString, stringToBytes } from '@massalabs/as-types';
import { Storage } from '@massalabs/massa-as-sdk';
import { FILE_LOCATION_TAG } from './storageKeys/tags';
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

/**
 * Retrieves the list of file locations.
 * @returns An array of file locations as strings.
 */
export function _getFileLocations(): string[] {
  const keys = Storage.getKeys(FILE_LOCATION_TAG);
  const locations: string[] = [];
  for (let i = 0; i < keys.length; i++) {
    locations.push(bytesToString(Storage.get(keys[i])));
  }
  return locations;
}
