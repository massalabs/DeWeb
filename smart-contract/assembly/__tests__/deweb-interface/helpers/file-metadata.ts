import { Metadata } from '../../../contracts/serializable/Metadata';
import {
  getMetadataFile,
  removeMetadataFile,
  setMetadataFile,
} from '../../../contracts/deweb-interface';
import { Args, bytesToString, stringToBytes } from '@massalabs/as-types';
import { Storage } from '@massalabs/massa-as-sdk';
import { fileMetadataKey } from '../../../contracts/internals/storageKeys/metadataKeys';

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

export function _assertMetadataAddedToFile(
  hashLocation: StaticArray<u8>,
  metadata: Metadata[],
): void {
  for (let i = 0; i < metadata.length; i++) {
    const value = getMetadataFile(
      new Args().add(hashLocation).add(metadata[i].key).serialize(),
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
