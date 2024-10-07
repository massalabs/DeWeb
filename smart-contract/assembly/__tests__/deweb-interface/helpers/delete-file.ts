import { stringToBytes, Args } from '@massalabs/as-types';
import { sha256, Storage } from '@massalabs/massa-as-sdk';
import { FileDelete } from '../../../contracts/serializable/FileDelete';
import {
  deleteFiles,
  getFileLocations,
} from '../../../contracts/deweb-interface';
import { Metadata } from '../../../contracts/serializable/Metadata';
import {
  fileMetadataKey,
  fileMetadataLocationKey,
} from '../../../contracts/internals/storageKeys/metadataKeys';
import { fileChunkCountKey } from '../../../contracts/internals/storageKeys/chunksKeys';
import {
  FILE_TAG,
  CHUNK_TAG,
} from '../../../contracts/internals/storageKeys/tags';

export function _deleteFiles(files: string[]): void {
  const filesToDelete: FileDelete[] = [];
  for (let i = 0; i < files.length; i++) {
    filesToDelete.push(new FileDelete(sha256(stringToBytes(files[i]))));
  }

  deleteFiles(
    new Args()
      .addSerializableObjectArray<FileDelete>(filesToDelete)
      .serialize(),
  );
}

export function _fileIsDeleted(location: string): void {
  const fileList = new Args(getFileLocations()).next<string[]>().unwrap();
  for (let i = 0; i < fileList.length; i++) {
    assert(
      !fileList.includes(location),
      `File ${location} should not be in the file list`,
    );
  }
}

export function hasNoFiles(): void {
  const fileList = new Args(getFileLocations()).next<string[]>().unwrap();
  assert(fileList.length === 0, 'FileList should be empty');
}

export function _assertFilesArePresent(files: string[]): void {
  const fileList = new Args(getFileLocations()).next<string[]>().unwrap();
  for (let i = 0; i < files.length; i++) {
    assert(
      fileList.includes(files[i]),
      `File ${files[i]} should be in the file list`,
    );
  }
}

export function _assertFilesAreNotPresent(files: string[]): void {
  for (let i = 0; i < files.length; i++) {
    const locationHash = sha256(stringToBytes(files[i]));
    _assertHasNoChunk(locationHash);
    _assertHasNoMetadata(locationHash);
    _assertHasNoChunkCount(locationHash);
    _assertHasNoLocation(locationHash);
  }
}

export function _assertHasMetadata(
  locationHash: StaticArray<u8>,
  metadata: Metadata[],
): void {
  for (let j = 0; j < metadata.length; j++) {
    const storageKey = fileMetadataKey(locationHash, metadata[j].key);
    assert(Storage.has(storageKey), 'Metadata should be stored');
    assert(
      Storage.get(storageKey).toString() == metadata[j].value.toString(),
      'Metadata value should be correct',
    );
  }
}

export function _assertHasNoMetadata(locationHash: StaticArray<u8>): void {
  const keys = Storage.getKeys(fileMetadataKey(locationHash));
  assert(keys.length === 0, 'Metadata should not be stored');
}

export function _assertHasNoChunkCount(locationHash: StaticArray<u8>): void {
  const chunkCountKey = fileChunkCountKey(locationHash);
  assert(!Storage.has(chunkCountKey), 'Chunk count should not be stored');
}

export function _assertHasNoLocation(locationHash: StaticArray<u8>): void {
  const locationKey = fileMetadataLocationKey(locationHash);
  assert(!Storage.has(locationKey), 'Location should not be stored');
}

export function _assertHasNoChunk(locationHash: StaticArray<u8>): void {
  const chunkKeys = Storage.getKeys(
    FILE_TAG.concat(locationHash).concat(CHUNK_TAG),
  );
  assert(chunkKeys.length === 0, 'Chunks should not be stored');
}
