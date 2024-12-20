import { Metadata } from '../../../contracts/serializable/Metadata';
import {
  removeMetadataFile,
  setMetadataFile,
} from '../../../contracts/deweb-interface';
import { Args, bytesToString, stringToBytes } from '@massalabs/as-types';
import { Storage } from '@massalabs/massa-as-sdk';
import {
  fileMetadataKey,
  globalMetadataKey,
} from '../../../contracts/internals/storageKeys/metadataKeys';
import { _getFileMetadata } from '../../../contracts/internals/metadata';

export function _addMetadataToFile(
  hashLocation: StaticArray<u8>,
  metadata: Metadata[],
): void {
  setMetadataFile(
    new Args()
      .add(hashLocation)
      .addSerializableObjectArray<Metadata>(metadata)
      .serialize(),
  );
}

export function _removeMetadataFromFile(
  locationHash: StaticArray<u8>,
  metadata: string[],
): void {
  removeMetadataFile(
    new Args().add(locationHash).add<string[]>(metadata).serialize(),
  );
}

export function _assertFileMetadata(
  hashLocation: StaticArray<u8>,
  metadata: Metadata[],
): void {
  for (let i = 0; i < metadata.length; i++) {
    const value = _getFileMetadata(
      hashLocation,
      stringToBytes(metadata[i].key),
    );

    assert(
      metadata[i].value === bytesToString(value),
      'Metadata should be equal',
    );

    const entry = Storage.getKeys(
      fileMetadataKey(hashLocation, stringToBytes(metadata[i].key)),
    );
    assert(entry.length === 1, 'Metadata should be added');
  }
}

export function _assertMetadataRemovedFromFile(
  locationHash: StaticArray<u8>,
  metadata: Metadata[],
): void {
  for (let i = 0; i < metadata.length; i++) {
    const entry = Storage.getKeys(
      fileMetadataKey(locationHash, stringToBytes(metadata[i].key)),
    );
    assert(entry.length === 0, 'Metadata should be removed');
  }
}

export function _assertGlobalMetadataRemoved(keys: string[]): void {
  for (let i = 0; i < keys.length; i++) {
    const entry = Storage.getKeys(fileMetadataKey(stringToBytes(keys[i])));
    assert(entry.length === 0, 'Metadata should be removed');
  }
}

export function _assertGlobalMetadata(keys: string[]): void {
  for (let i = 0; i < keys.length; i++) {
    const entry = Storage.getKeys(globalMetadataKey(stringToBytes(keys[i])));
    assert(entry.length === 1, 'Metadata should be added');
  }
}
