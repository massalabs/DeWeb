import {
  resetStorage,
  setDeployContext,
  sha256,
} from '@massalabs/massa-as-sdk';
import {} from '../contracts/internals/chunks';
import {
  constructor,
  deleteFiles,
  getChunk,
} from '../contracts/deweb-interface';
import { ChunkDelete } from '../contracts/serializable/Chunk';
import { Args, stringToBytes } from '@massalabs/as-types';
import { checkThat, chunkGetArgs, given } from './FileBuilder';

const user = 'AU12UBnqTHDQALpocVBnkPNy7y5CndUJQTLutaVDDFgMJcq5kQiKq';
const file1Path = 'file1';
const file2Path = 'file2';
const file1PathHash = sha256(stringToBytes(file1Path));
const file2PathHash = sha256(stringToBytes(file2Path));
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
        .withFile(file1Path, 1, [fileData1])
        .preStore()
        .storeAll();

      checkThat(myUpload).hasFiles();
    });

    test('Store 2 files with 1 chunk each', () => {
      const myUpload = given()
        .withFile(file1Path, 1, [fileData1])
        .withFile(file2Path, 1, [fileData2])
        .preStore()
        .storeAll();

      checkThat(myUpload).hasFiles();
    });

    test('Store a file with 2 chunks', () => {
      const myUpload = given()
        .withFile(file1Path, 2, [fileData1, fileData2])
        .preStore()
        .storeAll();

      checkThat(myUpload).hasFiles();
    });

    test('Store 2 batch of chunks', () => {
      const myFirstUpload = given()
        .withFile(file1Path, 2, [fileData1, fileData2])
        .preStore()
        .storeAll();

      const mySecondUpload = given()
        .withFile(file2Path, 2, [fileData1, fileData2])
        .preStore()
        .storeAll();

      checkThat(myFirstUpload).hasFiles();
      checkThat(mySecondUpload).hasFiles();
    });

    test('Update a chunk with different totalChunks', () => {
      const myUpload = given()
        .withFile(file1Path, 2, [fileData1, fileData2])
        .preStore()
        .storeAll();

      checkThat(myUpload).hasFiles();

      const myUpload2 = given()
        .withFile(file1Path, 3, [fileData1, fileData2, fileData1])
        .preStore()
        .storeAll();

      checkThat(myUpload2).hasFiles();
    });

    throws('Wrong totalChunk', () => {
      given()
        .withFile(file1Path, 3, [
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
      getChunk(chunkGetArgs(file1PathHash, 0));
    });
  });

  // Testing delete files
  describe('Delete File', () => {
    beforeEach(() => {
      resetStorage();
      setDeployContext(user);
      constructor(new Args().serialize());
    });

    test('that we can delete 1 file with 1 chunk', () => {
      const myUpload = given()
        .withFile(file1Path, 1, [fileData1])
        .preStore()
        .storeAll();

      const fileToDelete = new ChunkDelete(
        file1Path,
        sha256(stringToBytes(file1Path)),
      );

      myUpload.deleteFiles([fileToDelete]);

      throws('should throw if file does not exist', () => {
        getChunk(chunkGetArgs(file1PathHash, 0));
      });

      checkThat(myUpload).hasNoFiles();
    });

    test('that we can delete 1 file with 2 chunks', () => {
      const myUpload = given()
        .withFile(file1Path, 2, [fileData1, fileData2])
        .preStore()
        .storeAll();

      const fileToDelete = new ChunkDelete(file1Path, file1PathHash);

      myUpload.deleteFiles([fileToDelete]);

      throws('should throw if file does not exist', () => {
        getChunk(chunkGetArgs(file1PathHash, 0));
      });

      checkThat(myUpload).hasNoFiles();
    });

    test('that we can delete 1 file in batch', () => {
      const myFirstUpload = given()
        .withFile(file1Path, 2, [fileData1, fileData2])
        .preStore()
        .storeAll();

      const mySecondUpload = given()
        .withFile(file2Path, 2, [fileData1, fileData2])
        .preStore()
        .storeAll();

      const deleteFile1 = new ChunkDelete(file1Path, file1PathHash);

      myFirstUpload.deleteFiles([deleteFile1]);

      checkThat(myFirstUpload).fileIsDeleted(deleteFile1.filePath);
      checkThat(mySecondUpload).hasFiles;

      throws('should throw if file1 does not exists', () => {
        getChunk(chunkGetArgs(file1PathHash, 0));
      });
    });

    test('Should throw if there are no files to delete', () => {
      throws('should throw if there is no file to delete', () => {
        deleteFiles(
          new Args()
            .addSerializableObjectArray<ChunkDelete>([
              new ChunkDelete('DeleteFile1'),
            ])
            .serialize(),
        );
      });
    });
  });

  describe('Delete Files', () => {
    beforeEach(() => {
      resetStorage();
      setDeployContext(user);
      constructor(new Args().serialize());
    });
    test('that we can delete 2 files with 1 chunk', () => {
      const myUpload = given()
        .withFile(file1Path, 1, [fileData1])
        .withFile(file2Path, 1, [fileData2])
        .preStore()
        .storeAll();

      const fileToDelete1 = new ChunkDelete(file1Path, file1PathHash);
      const fileToDelete2 = new ChunkDelete(file2Path, file2PathHash);

      myUpload.deleteFiles([fileToDelete1, fileToDelete2]);

      throws('should throw if file does not exist', () => {
        getChunk(chunkGetArgs(file1PathHash, 0));
      });

      throws('should throw if file does not exist', () => {
        getChunk(chunkGetArgs(file2PathHash, 0));
      });

      checkThat(myUpload).hasNoFiles();
    });

    test('that we can delete n files with multiple chunks', () => {
      const myFirstUpload = given()
        .withFile(file1Path, 2, [fileData1, fileData2])
        .withFile(file2Path, 4, [fileData1, fileData2, fileData2, fileData2])
        .preStore()
        .storeAll();

      const fileToDelete1 = new ChunkDelete(file1Path, file1PathHash);
      const fileToDelete2 = new ChunkDelete(file2Path, file2PathHash);

      myFirstUpload.deleteFiles([fileToDelete1, fileToDelete2]);

      checkThat(myFirstUpload).hasNoFiles();
    });
  });
  describe('deleteWebsite', () => {
    beforeEach(() => {
      resetStorage();
      setDeployContext(user);
      constructor(new Args().serialize());
    });

    test('that we can delete a fullwebsite', () => {
      const myUpload = given()
        .withFile(file1Path, 1, [fileData1])
        .withFile(file2Path, 3, [fileData1, fileData1, fileData2])
        .preStore()
        .storeAll();

      myUpload.deleteWebsite();

      throws('should throw if file does not exist', () => {
        getChunk(chunkGetArgs(file1PathHash, 0));
      });

      checkThat(myUpload).hasNoFiles();
    });
  });
});
