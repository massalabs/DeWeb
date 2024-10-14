import { resetStorage, setDeployContext } from '@massalabs/massa-as-sdk';
import { constructor } from '../../contracts/deweb-interface';
import { Args } from '@massalabs/as-types';
import { ensure, uploader } from './helpers/Uploader';
import { Metadata } from '../../contracts/serializable/Metadata';

const user = 'AU12UBnqTHDQALpocVBnkPNy7y5CndUJQTLutaVDDFgMJcq5kQiKq';
const file1Path = 'file1';
const file2Path = 'file2';
const file3Path = 'file3';
const file4Path = 'file4';
const fileData1: StaticArray<u8> = [1, 2, 3, 4];
const fileData2: StaticArray<u8> = [5, 6, 7, 8];
const fileData3: StaticArray<u8> = [9, 10, 11, 12];
const fileData4: StaticArray<u8> = [13, 14, 15, 16];
const metadataKey1 = 'version';
const metadataValue1 = '1.0.0';
const metadataKey2 = 'serve';
const metadataValue2 = '0';

describe('Upload files', () => {
  beforeEach(() => {
    resetStorage();
    setDeployContext(user);
    constructor(new Args().serialize());
  });

  test('upload some files', () => {
    const myUpload = uploader()
      .withFile(file1Path, [fileData1, fileData2])
      .withFile(file2Path, [fileData2])
      .withFile(file3Path, [fileData3, fileData4])
      .withFile(file4Path, [fileData4])
      .init()
      .uploadAll();

    ensure(myUpload).hasUploadedFiles();
  });

  throws('if wrong total chunk', () => {
    uploader()
      .withFile(file1Path, [fileData1, fileData2], [], 1)
      .init()
      .uploadAll();
  });

  test('upload some files with global Metadata', () => {
    const myUpload = uploader()
      .withGlobalMetadata('version', '1.0.0')
      .withGlobalMetadata('isReady', '0')
      .withFile(file1Path, [fileData1, fileData2])
      .withFile(file2Path, [fileData2])
      .withFile(file3Path, [fileData3, fileData4])
      .withFile(file4Path, [fileData4])
      .init()
      .uploadAll();

    ensure(myUpload).hasUploadedFiles().hasGlobalMetadata();
  });

  test('upload some files with file Metadata', () => {
    const myUpload = uploader()
      .withFile(
        file1Path,
        [fileData1, fileData2],
        [
          new Metadata(metadataKey1, metadataValue1),
          new Metadata(metadataKey2, metadataValue2),
        ],
      )
      .init()
      .uploadAll();

    ensure(myUpload).hasUploadedFiles().hasFileMetadata();
  });

  test('upload some files then upload a new version', () => {
    uploader()
      .withFile(
        file1Path,
        [fileData1, fileData2],
        [
          new Metadata(metadataKey1, metadataValue1),
          new Metadata(metadataKey2, metadataValue2),
        ],
      )
      .withFile(file2Path, [fileData2])
      .init()
      .uploadAll();

    const myUpdate = uploader()
      .withFile(file1Path, [fileData1])
      .withFilesToDelete([file2Path])
      .init()
      .uploadAll();

    ensure(myUpdate)
      .hasUploadedFiles()
      .hasFileMetadata()
      .hasTheRightNumberOfFilesLocations()
      .hasTheRightChunkCount();
  });

  throws('if initialize with a file with nb chunk = 0', () => {
    uploader().withFile(file1Path, [fileData1], [], 0).init().uploadAll();
  });
});
