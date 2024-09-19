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
  preStoreFileChunks,
} from '../contracts/deweb-interface';
import { ChunkGet, ChunkPost, PreStore } from '../contracts/serializable/Chunk';
import { Args, bytesToU32, stringToBytes } from '@massalabs/as-types';

const user = 'AU12UBnqTHDQALpocVBnkPNy7y5CndUJQTLutaVDDFgMJcq5kQiKq';
const file1Name = 'file1';
const file2Name = 'file2';
const file1NameHash = sha256(stringToBytes(file1Name));
const file2NameHash = sha256(stringToBytes(file2Name));
const fileData1 = new StaticArray<u8>(10240).fill(1);
const fileData2 = new StaticArray<u8>(10241).fill(1);

describe('website deployer internals functions tests', () => {
  describe('Store', () => {
    beforeEach(() => {
      resetStorage();
      setDeployContext(user);
      constructor(new Args().serialize());
    });

    test('Store 1 file with 1 chunk', () => {
      // Prepare contract to store file
      const file = new PreStore(file1Name, file1NameHash, 1);
      preStoreFileChunks(
        new Args().addSerializableObjectArray<PreStore>([file]).serialize(),
      );

      const fileList = new Args(getFilePathList()).next<string[]>().unwrap();
      expect(fileList.length).toBe(1);
      expect(fileList[0]).toBe(file1Name);

      // Store file
      const chunk = new ChunkPost(file1Name, 0, fileData1);
      storeFileChunks(
        new Args().addSerializableObjectArray<ChunkPost>([chunk]).serialize(),
      );

      const result = getChunk(chunkGetArgs(file1NameHash, chunk.index));
      expect(result.length).toBe(10240);
    });

    test('Store 2 files with 1 chunk', () => {
      // Prepare contract to store files
      const file1 = new PreStore(file1Name, file1NameHash, 1);
      const file2 = new PreStore(file2Name, file2NameHash, 1);
      preStoreFileChunks(
        new Args()
          .addSerializableObjectArray<PreStore>([file1, file2])
          .serialize(),
      );

      const chunk1 = new ChunkPost(file1Name, 0, fileData1);
      const chunk2 = new ChunkPost(file2Name, 0, fileData1);

      storeFileChunks(
        new Args()
          .addSerializableObjectArray<ChunkPost>([chunk1, chunk2])
          .serialize(),
      );

      const fileList = getFileList();
      expect(fileList.length).toBe(2);
      expect(fileList[0]).toBe(file1Name);
      expect(fileList[1]).toBe(file2Name);
    });

    test('Store a file with 2 chunks', () => {
      // Prepare contract to store file
      const file = new PreStore(file1Name, file1NameHash, 2);
      preStoreFileChunks(
        new Args().addSerializableObjectArray<PreStore>([file]).serialize(),
      );

      const chunk1 = new ChunkPost(file1Name, 0, fileData1);
      const chunk2 = new ChunkPost(file1Name, 1, fileData2);

      storeFileChunks(
        new Args()
          .addSerializableObjectArray<ChunkPost>([chunk1, chunk2])
          .serialize(),
      );

      const fileListArgs = getFilePathList();
      const fileList = new Args(fileListArgs).next<string[]>().unwrap();

      expect(fileList.length).toBe(1);
      expect(fileList[0]).toBe(file1Name);

      const totalChunk = bytesToU32(
        getTotalChunksForFile(fileHashArgs(file1Name)),
      );
      expect(totalChunk).toBe(2);

      const result1 = getChunk(chunkGetArgs(file1NameHash, chunk1.index));
      const result2 = getChunk(chunkGetArgs(file1NameHash, chunk2.index));

      expect(result1.length).toBe(10240);
      expect(result2.length).toBe(10241);
    });

    test('Store 2 batch of chunks', () => {
      // Prepare contract to store files
      const file1 = new PreStore(file1Name, file1NameHash, 1);
      const file2 = new PreStore(file2Name, file2NameHash, 1);
      const file3 = new PreStore('file3', sha256(stringToBytes('file3')), 1);
      const file4 = new PreStore('file4', sha256(stringToBytes('file4')), 1);
      preStoreFileChunks(
        new Args()
          .addSerializableObjectArray<PreStore>([file1, file2, file3, file4])
          .serialize(),
      );

      const chunk1 = new ChunkPost(file1Name, 0, fileData1);
      const chunk2 = new ChunkPost(file2Name, 0, fileData2);

      storeFileChunks(
        new Args()
          .addSerializableObjectArray<ChunkPost>([chunk1, chunk2])
          .serialize(),
      );
      let totalChunk = new Args(getFilePathList()).nextStringArray().unwrap();
      expect(totalChunk.length).toBe(4);

      const chunk3 = new ChunkPost('file3', 0, fileData1);
      const chunk4 = new ChunkPost('file4', 0, fileData2);

      storeFileChunks(
        new Args()
          .addSerializableObjectArray<ChunkPost>([chunk3, chunk4])
          .serialize(),
      );

      totalChunk = new Args(getFilePathList()).nextStringArray().unwrap();
      expect(totalChunk.length).toBe(4);
    });

    test('Update a chunk with different totalChunks', () => {
      // Prepare contract to store file with 1 chunk
      let file = new PreStore(file1Name, file1NameHash, 1);
      preStoreFileChunks(
        new Args().addSerializableObjectArray<PreStore>([file]).serialize(),
      );

      const chunk1 = new ChunkPost(file1Name, 0, fileData1);
      storeFileChunks(
        new Args().addSerializableObjectArray<ChunkPost>([chunk1]).serialize(),
      );

      // Update the file to have 2 chunks
      file = new PreStore(file1Name, file1NameHash, 2);
      preStoreFileChunks(
        new Args().addSerializableObjectArray<PreStore>([file]).serialize(),
      );

      const newChunkPart1 = new ChunkPost(file1Name, 0, fileData1);
      const newChunkPart2 = new ChunkPost(file1Name, 1, fileData2);

      storeFileChunks(
        new Args()
          .addSerializableObjectArray<ChunkPost>([newChunkPart1, newChunkPart2])
          .serialize(),
      );

      const totalChunk = bytesToU32(
        getTotalChunksForFile(fileHashArgs(file1Name)),
      );
      expect(totalChunk).toBe(2);
    });

    throws('Chunks with non-coherent IDs', () => {
      // Prepare contract to store file with 2 chunks
      const file = new PreStore(file1Name, file1NameHash, 2);
      preStoreFileChunks(
        new Args().addSerializableObjectArray<PreStore>([file]).serialize(),
      );

      const chunk1 = new ChunkPost(file1Name, 0, fileData1);
      const chunk2 = new ChunkPost(file1Name, 2, fileData2); // Non-coherent ID (should not be above 1)

      storeFileChunks(
        new Args()
          .addSerializableObjectArray<ChunkPost>([chunk1, chunk2])
          .serialize(),
      );
    });

    throws('Wrong totalChunk', () => {
      // Prepare contract to store file with 2 chunks
      const file = new PreStore(file1Name, file1NameHash, 2);
      preStoreFileChunks(
        new Args().addSerializableObjectArray<PreStore>([file]).serialize(),
      );

      const chunk1 = new ChunkPost(file1Name, 0, fileData1);
      const chunk2 = new ChunkPost(file1Name, 1, fileData2);

      storeFileChunks(
        new Args()
          .addSerializableObjectArray<ChunkPost>([chunk1, chunk2])
          .serialize(),
      );

      getChunk(chunkGetArgs(file1NameHash, 2));
    });
  });

  describe('Get', () => {
    beforeEach(() => {
      resetStorage();
      setDeployContext(user);
      constructor(new Args().serialize());
    });

    throws('should throw if file does not exist', () => {
      getChunk(chunkGetArgs(file1NameHash, 0));
    });
  });
});

function chunkGetArgs(
  filePathHash: StaticArray<u8>,
  index: u32,
): StaticArray<u8> {
  return new ChunkGet(filePathHash, index).serialize();
}

function fileHashArgs(filePath: string): StaticArray<u8> {
  return new Args().add(sha256(stringToBytes(filePath))).serialize();
}

function getFileList(): string[] {
  return new Args(getFilePathList()).next<string[]>().unwrap();
}
