import { sha256, Storage } from '@massalabs/massa-as-sdk';
import { _getTotalChunk } from '../../../contracts/internals/chunks';
import {
  FILE_TAG,
  CHUNK_TAG,
} from '../../../contracts/internals/storageKeys/tags';
import { stringToBytes } from '@massalabs/as-types';

export function _assertFileChunkNbIs(location: string, expectedNb: u32): void {
  const locationHash = sha256(stringToBytes(location));
  const totalChunk = _getTotalChunk(locationHash);
  assert(totalChunk === expectedNb, 'Total chunk should be correct');

  const chunksKeys = Storage.getKeys(
    FILE_TAG.concat(locationHash).concat(CHUNK_TAG),
  );

  assert(
    chunksKeys.length === expectedNb,
    'Number of chunks should be correct',
  );
}
