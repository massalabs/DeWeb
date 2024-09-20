import {
  resetStorage,
  setDeployContext,
  sha256,
} from '@massalabs/massa-as-sdk';
import {} from '../contracts/internals/chunks';
import {
  constructor,
  getChunk,
  getFilePathList,
} from '../contracts/deweb-interface';
import { ChunkGet } from '../contracts/serializable/Chunk';
import { Args, stringToBytes } from '@massalabs/as-types';
import { given, checkThat } from './FileBuilder';

const user = 'AU12UBnqTHDQALpocVBnkPNy7y5CndUJQTLutaVDDFgMJcq5kQiKq';
const file1Name = 'file1';
const file2Name = 'file2';
const file1NameHash = sha256(stringToBytes(file1Name));
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
      const myUpload = given()
        .withFile(file1Name, 1, [fileData1])
        .preStore()
        .storeAll();

      checkThat(myUpload).hasFiles();
    });

    test('Store 2 files with 1 chunk each', () => {
      const myUpload = given()
        .withFile(file1Name, 1, [fileData1])
        .withFile(file2Name, 1, [fileData2])
        .preStore()
        .storeAll();

      checkThat(myUpload).hasFiles();
    });

    test('Store a file with 2 chunks', () => {
      const myUpload = given()
        .withFile(file1Name, 2, [fileData1, fileData2])
        .preStore()
        .storeAll();

      checkThat(myUpload).hasFiles();
    });

    test('Store 2 batch of chunks', () => {
      const myFirstUpload = given()
        .withFile(file1Name, 2, [fileData1, fileData2])
        .preStore()
        .storeAll();

      const mySecondUpload = given()
        .withFile(file2Name, 2, [fileData1, fileData2])
        .preStore()
        .storeAll();

      checkThat(myFirstUpload).hasFiles();
      checkThat(mySecondUpload).hasFiles();
    });

    test('Update a chunk with different totalChunks', () => {
      const myUpload = given()
        .withFile(file1Name, 2, [fileData1, fileData2])
        .preStore()
        .storeAll();

      checkThat(myUpload).hasFiles();

      const myUpload2 = given()
        .withFile(file1Name, 3, [fileData1, fileData2, fileData1])
        .preStore()
        .storeAll();

      checkThat(myUpload2).hasFiles();
    });

    throws('Wrong totalChunk', () => {
      given()
        .withFile(file1Name, 3, [
          fileData1,
          fileData2,
          fileData2,
          fileData1,
          fileData2,
          fileData2,
          fileData1,
        ])
        .preStore()
        .storeAll();
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
