import { sha256, Storage } from '@massalabs/massa-as-sdk';
import { _pushFileLocation } from './location';
import { fileMetadataLocationKey } from './storageKeys/metadataKeys';
import { Metadata } from '../serializable/Metadata';
import { _editFileMetadata } from './metadata';
import {
  _getTotalChunk,
  _removeChunksRange,
  _setFileChunkCount,
} from './chunks';
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
  hashLocation: StaticArray<u8>,
  totalChunk: u32,
  metadata: Metadata[],
): void {
  assert(totalChunk > 0, 'Total chunk must be greater than 0');

  // Add file location if it doesn't exist
  if (!Storage.has(fileMetadataLocationKey(hashLocation))) {
    assert(
      sha256(stringToBytes(location)).toString() == hashLocation.toString(),
      'Hash location must match',
    );
    _pushFileLocation(location, hashLocation);
  }

  // Set file metadata
  for (let i = 0; i < metadata.length; i++) {
    _editFileMetadata(
      stringToBytes(metadata[i].key),
      stringToBytes(metadata[i].value),
      hashLocation,
    );
  }

  // Update chunk count and remove extra chunks if necessary
  const currentTotalChunk = _getTotalChunk(hashLocation);
  if (totalChunk !== currentTotalChunk) {
    if (totalChunk < currentTotalChunk) {
      // Remove extra chunks So we don't remove the hole file.
      // TODO: Validate this solution as it may not be the best approach.
      _removeChunksRange(hashLocation, totalChunk, currentTotalChunk - 1);
    }
    _setFileChunkCount(hashLocation, totalChunk);
  }
}
