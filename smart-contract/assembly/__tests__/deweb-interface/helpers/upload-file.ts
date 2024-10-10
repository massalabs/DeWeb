import { sha256, Storage } from '@massalabs/massa-as-sdk';
import { _getTotalChunk } from '../../../contracts/internals/chunks';
import { stringToBytes } from '@massalabs/as-types';
import { fileChunkKeyPrefix } from '../../../contracts/internals/storageKeys/chunksKeys';

export function _assertFileChunkNbIs(location: string, expectedNb: u32): void {
  const locationHash = sha256(stringToBytes(location));
  const totalChunk = _getTotalChunk(locationHash);

  assert(totalChunk === expectedNb, 'Total chunk should be correct');

  const chunksKeys = Storage.getKeys(fileChunkKeyPrefix(locationHash));

  assert(
    chunksKeys.length === expectedNb,
    'Number of chunks should be correct',
  );
}
