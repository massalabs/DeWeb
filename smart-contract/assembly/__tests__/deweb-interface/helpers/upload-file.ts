import { getKeys, sha256 } from '@massalabs/massa-as-sdk';
import { _getTotalChunk } from '../../../contracts/internals/chunks';
import { stringToBytes } from '@massalabs/as-types';
import { getFileChunk } from '../../../contracts/deweb-interface';
import { FILE_LOCATION_TAG } from '../../../contracts/internals/storageKeys/tags';
import { chunkGetArgs } from './Uploader';

export function _assertFileChunkCountIsCorrect(
  location: string,
  expectedNb: u32,
): void {
  const locationHash = sha256(stringToBytes(location));
  const totalChunk = _getTotalChunk(locationHash);
  assert(totalChunk === expectedNb, 'Total chunk should be correct');
}

export function _assertFileChunksAreCorrect(
  location: string,
  chunkData: StaticArray<u8>[],
  nbChunks: u32,
): void {
  const locationHash = sha256(stringToBytes(location));

  for (let i = u32(0); i < nbChunks; i++) {
    const storedChunk = getFileChunk(chunkGetArgs(locationHash, i));
    assert(
      storedChunk.toString() == chunkData[i].toString(),
      `Chunk ${i} of ${location} should be correct`,
    );
  }
}

export function _assertRightNbOfFilesLocations(nb: u32): void {
  const dataStoreEntriesLocation = getKeys(FILE_LOCATION_TAG);
  assert(dataStoreEntriesLocation.length == nb, 'File count should be correct');
}
