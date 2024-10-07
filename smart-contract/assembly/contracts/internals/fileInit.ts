import { Storage } from '@massalabs/massa-as-sdk';
import { _pushFileLocation } from './location';
import { fileMetadataLocationKey } from './storageKeys/metadataKeys';
import { Metadata } from '../serializable/Metadata';
import { _editFileMetadata } from './metadata';
import {
  _getTotalChunk,
  _removeChunksRange,
  _setFileChunkCount,
} from './chunks';

export function _fileInit(
  location: string,
  hashLocation: StaticArray<u8>,
  totalChunk: u32,
  metadata: Metadata[],
): void {
  assert(totalChunk > 0, 'Total chunk must be greater than 0');

  if (!Storage.has(fileMetadataLocationKey(hashLocation))) {
    _pushFileLocation(location, hashLocation);
  }

  for (let i = 0; i < metadata.length; i++) {
    _editFileMetadata(metadata[i].key, metadata[i].value, hashLocation);
  }

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
