import { Metadata } from '../../../contracts/serializable/Metadata';
import {
  getMetadataFile,
  removeMetadataFile,
  setMetadataFile,
} from '../../../contracts/deweb-interface';
import { Args } from '@massalabs/as-types';
import { Storage } from '@massalabs/massa-as-sdk';
import { fileMetadataKey } from '../../../contracts/internals/storageKeys/metadataKeys';
import { MetadataDelete } from '../../../contracts/serializable/MetadataDelete';

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
  metadata: MetadataDelete[],
): void {
  removeMetadataFile(
    new Args()
      .add(locationHash)
      .addSerializableObjectArray<MetadataDelete>(metadata)
      .serialize(),
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
      metadata[i].value.toString() === value.toString(),
      'Metadata should be equal',
    );

    const entry = Storage.getKeys(
      fileMetadataKey(hashLocation, metadata[i].key),
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
      fileMetadataKey(locationHash, metadata[i].key),
    );
    assert(entry.length === 0, 'Metadata should be removed');
  }
}
