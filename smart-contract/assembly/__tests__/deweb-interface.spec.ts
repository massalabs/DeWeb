import {
  resetStorage,
  setDeployContext,
  sha256,
} from '@massalabs/massa-as-sdk';
import {} from '../contracts/internals/chunks';
import {
  constructor,
  getChunk,
  getTotalChunksForFile,
  getFilePathList,
  storeFileChunks,
} from '../contracts/deweb-interface';
import { ChunkGet, ChunkPost } from '../contracts/serializable/Chunk';
import { Args, bytesToU32, stringToBytes } from '@massalabs/as-types';

const user = 'AU12UBnqTHDQALpocVBnkPNy7y5CndUJQTLutaVDDFgMJcq5kQiKq';
const fakeFile1 = new StaticArray<u8>(10240).fill(1);
const fakeFile2 = new StaticArray<u8>(10241).fill(1);

describe('website deployer internals functions tests', () => {
  describe('Store', () => {
    beforeEach(() => {
      resetStorage();
      setDeployContext(user);
      constructor(new Args().serialize());
    });

    test('Store 1 file with 1 chunk', () => {
      const chunk = new ChunkPost('file1', 0, fakeFile1, 1);

      storeFileChunks(
        new Args().addSerializableObjectArray<ChunkPost>([chunk]).serialize(),
      );

      const result = getChunk(chunkGetArgs(chunk.filePath, chunk.id));

      expect(result.length).toBe(10240);

      const fileList = new Args(getFilePathList()).next<string[]>().unwrap();

      expect(fileList.length).toBe(1);
      expect(fileList[0]).toBe('file1');
    });

    test('Store 2 files with 1 chunk', () => {
      const chunk1 = new ChunkPost('file1', 0, fakeFile1);
      const chunk2 = new ChunkPost('file2', 0, fakeFile1);

      storeFileChunks(
        new Args()
          .addSerializableObjectArray<ChunkPost>([chunk1, chunk2])
          .serialize(),
      );

      const fileList = getFileList();
      expect(fileList.length).toBe(2);
      expect(fileList[0]).toBe('file1');
      expect(fileList[1]).toBe('file2');
    });

    test('Store a file with 2 chunks', () => {
      const chunk1 = new ChunkPost('file1', 0, fakeFile1, 2);
      const chunk2 = new ChunkPost('file1', 1, fakeFile2, 2);

      storeFileChunks(
        new Args()
          .addSerializableObjectArray<ChunkPost>([chunk1, chunk2])
          .serialize(),
      );

      const fileListArgs = getFilePathList();
      const fileList = new Args(fileListArgs).next<string[]>().unwrap();

      expect(fileList.length).toBe(1);
      expect(fileList[0]).toBe('file1');

      const nbChunk = bytesToU32(getTotalChunksForFile(fileHashArgs('file1')));
      expect(nbChunk).toBe(2);

      const result1 = getChunk(chunkGetArgs(chunk1.filePath, chunk1.id));
      const result2 = getChunk(chunkGetArgs(chunk2.filePath, chunk2.id));

      expect(result1.length).toBe(10240);
      expect(result2.length).toBe(10241);
    });

    // TODO add test for updating a chunk with different totalChunks
  });

  describe('Get', () => {
    beforeEach(() => {
      resetStorage();
      setDeployContext(user);
      constructor(new Args().serialize());
    });

    throws('should throw if file does not exist', () => {
      getChunk(chunkGetArgs('file1', 0));
    });
  });
});

function chunkGetArgs(filePath: string, id: u32): StaticArray<u8> {
  return new ChunkGet(sha256(stringToBytes(filePath)), id).serialize();
}

function fileHashArgs(filePath: string): StaticArray<u8> {
  return new Args().add(sha256(stringToBytes(filePath))).serialize();
}

function getFileList(): string[] {
  return new Args(getFilePathList()).next<string[]>().unwrap();
}
