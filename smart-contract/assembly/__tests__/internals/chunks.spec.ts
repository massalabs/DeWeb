import { resetStorage, sha256 } from '@massalabs/massa-as-sdk';
import {
  createRandomByteArray,
  storeFileInChunks,
  verifyStoredFile,
} from './utils';
import { _setTotalChunk } from '../../contracts/internals/chunks';
import { stringToBytes } from '@massalabs/as-types';

const fileName1 = 'file1';
const fileName2 = 'file2';
const fileName1Hash = sha256(stringToBytes(fileName1));
const fileName2Hash = sha256(stringToBytes(fileName2));

describe('website deployer internals functions tests', () => {
  describe('Store', () => {
    beforeEach(() => {
      resetStorage();
    });

    test('Store single file with one chunk', () => {
      const fileData = createRandomByteArray(1000);
      const chunkSize = 1000;
      _setTotalChunk(fileName1Hash, 1);
      storeFileInChunks(fileName1, fileData, chunkSize);
      verifyStoredFile(fileName1, fileData, chunkSize);
    });

    test('Store single file with multiple chunks', () => {
      const fileData = createRandomByteArray(10240);
      const chunkSize = 4096;
      _setTotalChunk(fileName2Hash, 3);
      storeFileInChunks(fileName2, fileData, chunkSize);
      verifyStoredFile(fileName2, fileData, chunkSize);
    });

    test('Store multiple files with varying chunk sizes', () => {
      const file1Data = createRandomByteArray(15000);
      const file2Data = createRandomByteArray(8000);
      const chunk1Size = 5000;
      const chunk2Size = 3000;
      _setTotalChunk(fileName1Hash, 3);
      _setTotalChunk(fileName2Hash, 3);
      storeFileInChunks(fileName1, file1Data, chunk1Size);
      storeFileInChunks(fileName2, file2Data, chunk2Size);
      verifyStoredFile(fileName1, file1Data, chunk1Size);
      verifyStoredFile(fileName2, file2Data, chunk2Size);
    });

    test('Update existing file', () => {
      const fileName = 'updateFile';
      const fileNameHash = sha256(stringToBytes(fileName));
      const originalData = createRandomByteArray(10000);
      const updatedData = createRandomByteArray(12000);
      const chunkSize = 4000;
      _setTotalChunk(fileNameHash, 3);
      storeFileInChunks(fileName, originalData, chunkSize);
      verifyStoredFile(fileName, originalData, chunkSize);
      storeFileInChunks(fileName, updatedData, chunkSize);
      verifyStoredFile(fileName, updatedData, chunkSize);
    });

    test('Store file with random length and chunk size', () => {
      const fileName = 'randomFile';
      const fileNameHash = sha256(stringToBytes(fileName));

      const fileLength = u32(Math.floor(Math.random() * 50000) + 1000); // Random length between 1000 and 51000
      const chunkSize = u32(Math.floor(Math.random() * 1000) + 100); // Random chunk size between 100 and 1100
      const fileData = createRandomByteArray(fileLength);
      _setTotalChunk(fileNameHash, 100);
      storeFileInChunks(fileName, fileData, chunkSize);
      verifyStoredFile(fileName, fileData, chunkSize);
    });

    throws('If total chunk total is 0', () => {
      const fileData = createRandomByteArray(1000);
      const chunkSize = 1000;
      storeFileInChunks(fileName1, fileData, chunkSize);
    });

    throws('If index is out of bounds', () => {
      const fileData = createRandomByteArray(2000);
      const chunkSize = 1000;
      _setTotalChunk(fileName1Hash, 1);
      storeFileInChunks(fileName1, fileData, chunkSize);
    });
  });
});
