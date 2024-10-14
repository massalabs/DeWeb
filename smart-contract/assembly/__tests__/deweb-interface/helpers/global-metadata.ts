import { Args, bytesToString, stringToBytes } from '@massalabs/as-types';
import {
  removeMetadataGlobal,
  setMetadataGlobal,
} from '../../../contracts/deweb-interface';
import { Metadata } from '../../../contracts/serializable/Metadata';
import { Storage } from '@massalabs/massa-as-sdk';
import { globalMetadataKey } from '../../../contracts/internals/storageKeys/metadataKeys';
import { _getGlobalMetadata } from '../../../contracts/internals/metadata';

export function _addGlobalMetadata(metadataList: Metadata[]): void {
  setMetadataGlobal(
    new Args().addSerializableObjectArray<Metadata>(metadataList).serialize(),
  );
}

export function _removeGlobalMetadata(metadataList: Metadata[]): void {
  const metadataKeys: string[] = [];
  for (let i = 0; i < metadataList.length; i++) {
    metadataKeys.push(metadataList[i].key);
  }
  removeMetadataGlobal(new Args().add<string[]>(metadataKeys).serialize());
}

export function _assertGlobalMetadataRemoved(metadataList: Metadata[]): void {
  for (let i = 0; i < metadataList.length; i++) {
    const entry = Storage.getKeys(
      globalMetadataKey(stringToBytes(metadataList[i].key)),
    );
    assert(entry.length === 0, 'Metadata should be removed');
  }
}

export function _assertGlobalMetadata(metadataList: Metadata[]): void {
  for (let i = 0; i < metadataList.length; i++) {
    const metadata = _getGlobalMetadata(stringToBytes(metadataList[i].key));

    assert(
      metadataList[i].value === bytesToString(metadata),
      'Metadata should be equal',
    );

    const entry = Storage.getKeys(
      globalMetadataKey(stringToBytes(metadataList[i].key)),
    );
    assert(entry.length === 1, 'Metadata should be added');
  }
}
