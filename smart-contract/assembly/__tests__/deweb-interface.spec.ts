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
      const chunk = new ChunkPost('file1', 0, fakeFile1);

      storeFileChunks(
        new Args().addSerializableObjectArray<ChunkPost>([chunk]).serialize(),
      );

      const result = getChunk(chunkGetArgs(chunk.filePath, chunk.index));

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
      const chunk1 = new ChunkPost('file1', 0, fakeFile1);
      const chunk2 = new ChunkPost('file1', 1, fakeFile2);

      storeFileChunks(
        new Args()
          .addSerializableObjectArray<ChunkPost>([chunk1, chunk2])
          .serialize(),
      );

      const fileListArgs = getFilePathList();
      const fileList = new Args(fileListArgs).next<string[]>().unwrap();

      expect(fileList.length).toBe(1);
      expect(fileList[0]).toBe('file1');

      const totalChunk = bytesToU32(
        getTotalChunksForFile(fileHashArgs('file1')),
      );
      expect(totalChunk).toBe(2);

      const result1 = getChunk(chunkGetArgs(chunk1.filePath, chunk1.index));
      const result2 = getChunk(chunkGetArgs(chunk2.filePath, chunk2.index));

      expect(result1.length).toBe(10240);
      expect(result2.length).toBe(10241);
    });

    test('Store 2 batch of chunks', () => {
      const chunk1 = new ChunkPost('file1', 0, fakeFile1);
      const chunk2 = new ChunkPost('file2', 0, fakeFile2);

      storeFileChunks(
        new Args()
          .addSerializableObjectArray<ChunkPost>([chunk1, chunk2])
          .serialize(),
      );
      let totalChunk = new Args(getFilePathList()).nextStringArray().unwrap();
      expect(totalChunk.length).toBe(2);

      const chunk3 = new ChunkPost('file3', 0, fakeFile1);
      const chunk4 = new ChunkPost('file4', 0, fakeFile2);

      storeFileChunks(
        new Args()
          .addSerializableObjectArray<ChunkPost>([chunk3, chunk4])
          .serialize(),
      );

      totalChunk = new Args(getFilePathList()).nextStringArray().unwrap();
      expect(totalChunk.length).toBe(4);
    });

    test('Update a chunk with different totalChunks', () => {
      const chunk1 = new ChunkPost('file1', 0, fakeFile1);
      storeFileChunks(
        new Args().addSerializableObjectArray<ChunkPost>([chunk1]).serialize(),
      );

      const newChunkPart1 = new ChunkPost('file1', 0, fakeFile1);
      const newChunkPart2 = new ChunkPost('file1', 1, fakeFile2);

      storeFileChunks(
        new Args()
          .addSerializableObjectArray<ChunkPost>([newChunkPart1, newChunkPart2])
          .serialize(),
      );

      const totalChunk = bytesToU32(
        getTotalChunksForFile(fileHashArgs('file1')),
      );
      expect(totalChunk).toBe(2);
    });

    throws('Post chunks in reverse order', () => {
      const chunk1 = new ChunkPost('file1', 1, fakeFile2);
      const chunk2 = new ChunkPost('file1', 0, fakeFile1);

      storeFileChunks(
        new Args()
          .addSerializableObjectArray<ChunkPost>([chunk1, chunk2])
          .serialize(),
      );
    });

    throws('Chunks with non-coherent IDs', () => {
      const chunk1 = new ChunkPost('file1', 0, fakeFile1);
      const chunk2 = new ChunkPost('file1', 2, fakeFile2); // Non-coherent ID (should not be above 1)

      storeFileChunks(
        new Args()
          .addSerializableObjectArray<ChunkPost>([chunk1, chunk2])
          .serialize(),
      );
    });

    throws('Wrong totalChunk', () => {
      // FIXME: Problem with the total chunk solution is if we say we have 2 chunks and we only provide 1,
      const chunk1 = new ChunkPost('file1', 0, fakeFile1);
      const chunk2 = new ChunkPost('file1', 1, fakeFile2);

      storeFileChunks(
        new Args()
          .addSerializableObjectArray<ChunkPost>([chunk1, chunk2])
          .serialize(),
      );

      getChunk(chunkGetArgs('file1', 2));
    });
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

function chunkGetArgs(filePath: string, index: u32): StaticArray<u8> {
  return new ChunkGet(sha256(stringToBytes(filePath)), index).serialize();
}

function fileHashArgs(filePath: string): StaticArray<u8> {
  return new Args().add(sha256(stringToBytes(filePath))).serialize();
}

function getFileList(): string[] {
  return new Args(getFilePathList()).next<string[]>().unwrap();
}
