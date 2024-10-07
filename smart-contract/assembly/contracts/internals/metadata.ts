import { Storage } from '@massalabs/massa-as-sdk';
import { fileMetadataKey, globalMetadataKey } from './storageKeys/metadataKeys';
import { FILE_METADATA_TAG } from './storageKeys/tags';

/* -------------------------------------------------------------------------- */
/*                               GLOBAL METADATA                              */
/* -------------------------------------------------------------------------- */

/**
 * Edits or adds a global metadata entry.
 * @param metadataKey - The key of the metadata entry.
 * @param metadataValue - The value of the metadata entry.
 */
export function _editGlobalMetadata(
  metadataKey: StaticArray<u8>,
  metadataValue: StaticArray<u8>,
): void {
  Storage.set(globalMetadataKey(metadataKey), metadataValue);
}

/**
 * Removes a global metadata entry.
 * @param metadataKey - The key of the metadata entry to remove.
 * @throws If the metadata key is not found.
 */
export function _removeGlobalMetadata(metadataKey: StaticArray<u8>): void {
  assert(Storage.has(globalMetadataKey(metadataKey)), 'Metadata key not found');
  Storage.del(globalMetadataKey(metadataKey));
}

/**
 * Retrieves a global metadata entry.
 * @param metadataKey - The key of the metadata entry to retrieve.
 * @returns The value of the metadata entry as a StaticArray<u8>.
 */
export function _getGlobalMetadata(
  metadataKey: StaticArray<u8>,
): StaticArray<u8> {
  return Storage.get(globalMetadataKey(metadataKey));
}

/* -------------------------------------------------------------------------- */
/*                                FILE METADATA                               */
/* -------------------------------------------------------------------------- */

/**
 * Edits or adds a file-specific metadata entry.
 * @param metadataKey - The key of the metadata entry.
 * @param metadataValue - The value of the metadata entry.
 * @param hashLocation - The hash of the file location.
 */
export function _editFileMetadata(
  metadataKey: StaticArray<u8>,
  metadataValue: StaticArray<u8>,
  hashLocation: StaticArray<u8>,
): void {
  Storage.set(fileMetadataKey(hashLocation, metadataKey), metadataValue);
}

/**
 * Removes a file-specific metadata entry.
 * @param metadataKey - The key of the metadata entry to remove.
 * @param hashLocation - The hash of the file location.
 */
export function _removeFileMetadata(
  metadataKey: StaticArray<u8>,
  hashLocation: StaticArray<u8>,
): void {
  assert(
    Storage.has(fileMetadataKey(hashLocation, metadataKey)),
    'Metadata key not found',
  );
  Storage.del(fileMetadataKey(hashLocation, metadataKey));
}

/**
 * Removes all metadata entries for a specific file.
 * @param hashLocation - The hash of the file location.
 */
export function _removeAllFileMetadata(hashLocation: StaticArray<u8>): void {
  const keys = Storage.getKeys(FILE_METADATA_TAG.concat(hashLocation));
  for (let i = 0; i < keys.length; i++) {
    Storage.del(keys[i]);
  }
}

/**
 * Retrieves a file-specific metadata entry.
 * @param hashLocation - The hash of the file location.
 * @param metadataKey - The key of the metadata entry to retrieve.
 * @returns The value of the metadata entry as a StaticArray<u8>.
 */
export function _getFileMetadata(
  hashLocation: StaticArray<u8>,
  metadataKey: StaticArray<u8>,
): StaticArray<u8> {
  return Storage.get(fileMetadataKey(hashLocation, metadataKey));
}
