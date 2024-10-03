import { Storage } from '@massalabs/massa-as-sdk';
import { fileMetadataKey, globalMetadataKey } from './storageKeys/metadataKeys';
import { FILE_METADATA_TAG } from './storageKeys/tags';

/* -------------------------------------------------------------------------- */
/*                               GLOBAL METADATA                              */
/* -------------------------------------------------------------------------- */

export function _editGlobalMetadata(
  metadataKey: StaticArray<u8>,
  metadataValue: StaticArray<u8>,
): void {
  Storage.set(globalMetadataKey(metadataKey), metadataValue);
}

export function _removeGlobalMetadata(metadataKey: StaticArray<u8>): void {
  Storage.del(globalMetadataKey(metadataKey));
}

export function _getGlobalMetadata(
  metadataKey: StaticArray<u8>,
): StaticArray<u8> {
  return Storage.get(globalMetadataKey(metadataKey));
}

/* -------------------------------------------------------------------------- */
/*                                FILE METADATA                               */
/* -------------------------------------------------------------------------- */

export function _editFileMetadata(
  metadataKey: StaticArray<u8>,
  metadataValue: StaticArray<u8>,
  hashLocation: StaticArray<u8>,
): void {
  Storage.set(fileMetadataKey(hashLocation, metadataKey), metadataValue);
}

export function _removeFileMetadata(
  metadataKey: StaticArray<u8>,
  hashLocation: StaticArray<u8>,
): void {
  Storage.del(fileMetadataKey(hashLocation, metadataKey));
}

export function _removeAllFileMetadata(hashLocation: StaticArray<u8>): void {
  const keys = Storage.getKeys(FILE_METADATA_TAG.concat(hashLocation));
  for (let i = 0; i < keys.length; i++) {
    Storage.del(keys[i]);
  }
}

export function _getFileMetadata(
  hashLocation: StaticArray<u8>,
  metadataKey: StaticArray<u8>,
): StaticArray<u8> {
  return Storage.get(fileMetadataKey(hashLocation, metadataKey));
}
