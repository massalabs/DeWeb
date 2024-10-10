import { sha256, Storage } from '@massalabs/massa-as-sdk';
import { _pushFileLocation } from './location';
import { fileLocationKey } from './storageKeys/metadataKeys';
import { Metadata } from '../serializable/Metadata';
import { _editFileMetadata } from './metadata';
import { _deleteFile, _setFileChunkCount } from './chunks';
import { stringToBytes } from '@massalabs/as-types';

/**
 * Initializes a file in the smart contract storage.
 * @param location - The location of the file.
 * @param hashLocation - The hash of the file location.
 * @param totalChunk - The total number of chunks for the file.
 * @param metadata - An array of Metadata objects for the file.
 * @throws If the total chunk count is 0 or less.
 */
export function _fileInit(
  location: string,
  totalChunk: u32,
  metadata: Metadata[],
): void {
  const hashLocation = sha256(stringToBytes(location));

  if (Storage.has(fileLocationKey(hashLocation))) {
    // When updating a file, delete the old file data
    _deleteFile(hashLocation);
  }

  _pushFileLocation(location, hashLocation);

  for (let i = 0; i < metadata.length; i++) {
    _editFileMetadata(
      stringToBytes(metadata[i].key),
      stringToBytes(metadata[i].value),
      hashLocation,
    );
  }

  _setFileChunkCount(hashLocation, totalChunk);
}
