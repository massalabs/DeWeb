import { resetStorage } from '@massalabs/massa-as-sdk';
import {
  createRandomByteArray,
  storeFileInChunks,
  verifyStoredFile,
  verifyFilesInList,
} from './utils';

const fileName1 = 'file1';
const fileName2 = 'file2';

describe('website deployer internals functions tests', () => {
  describe('Store', () => {
    beforeEach(() => {
      resetStorage();
    });

    test('Store single file with one chunk', () => {
      const fileData = createRandomByteArray(1000);
      const chunkSize = 1000;
      storeFileInChunks(fileName1, fileData, chunkSize);
      verifyStoredFile(fileName1, fileData, chunkSize);
      verifyFilesInList([fileName1]);
    });

    test('Store single file with multiple chunks', () => {
      const fileData = createRandomByteArray(10240);
      const chunkSize = 4096;
      storeFileInChunks(fileName2, fileData, chunkSize);
      verifyStoredFile(fileName2, fileData, chunkSize);
      verifyFilesInList([fileName2]);
    });

    test('Store multiple files with varying chunk sizes', () => {
      const file1Data = createRandomByteArray(15000);
      const file2Data = createRandomByteArray(8000);
      const chunk1Size = 5000;
      const chunk2Size = 3000;
      storeFileInChunks(fileName1, file1Data, chunk1Size);
      storeFileInChunks(fileName2, file2Data, chunk2Size);
      verifyStoredFile(fileName1, file1Data, chunk1Size);
      verifyStoredFile(fileName2, file2Data, chunk2Size);
      verifyFilesInList([fileName1, fileName2]);
    });

    // FIXME: We should investigate why it fails
    // test('Update existing file', () => {
    //   const fileName = 'updateFile';
    //   const originalData = createRandomByteArray(10000);
    //   const updatedData = createRandomByteArray(12000);
    //   const chunkSize = 4000;
    //   storeFileInChunks(fileName, originalData, chunkSize);
    //   verifyStoredFile(fileName, originalData, chunkSize);
    //   storeFileInChunks(fileName, updatedData, chunkSize);
    //   verifyStoredFile(fileName, updatedData, chunkSize);
    //   verifyFilesInList([fileName]);
    // });

    test('Store file with random length and chunk size', () => {
      const fileName = 'randomFile';
      const fileLength = u32(Math.floor(Math.random() * 50000) + 1000); // Random length between 1000 and 51000
      const chunkSize = u32(Math.floor(Math.random() * 1000) + 100); // Random chunk size between 100 and 1100
      const fileData = createRandomByteArray(fileLength);
      storeFileInChunks(fileName, fileData, chunkSize);
      verifyStoredFile(fileName, fileData, chunkSize);
      verifyFilesInList([fileName]);
    });
  });
});
