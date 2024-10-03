import { resetStorage, setDeployContext } from '@massalabs/massa-as-sdk';
import { constructor } from '../../contracts/deweb-interface';
import { Args, stringToBytes } from '@massalabs/as-types';
import { checkThat, given } from './FileBuilder';
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
const metadataKey1 = stringToBytes('version');
const metadataValue1 = stringToBytes('1.0.0');
const metadataKey2 = stringToBytes('serve');
const metadataValue2 = stringToBytes('0');

describe('Upload files', () => {
  beforeEach(() => {
    resetStorage();
    setDeployContext(user);
    constructor(new Args().serialize());
  });

  test('upload some files', () => {
    const myUpload = given()
      .withFile(file1Path, 2, [fileData1, fileData2])
      .withFile(file2Path, 1, [fileData2])
      .withFile(file3Path, 2, [fileData3, fileData4])
      .withFile(file4Path, 1, [fileData4])
      .init()
      .uploadAll();

    checkThat(myUpload).hasUploadedFiles();
  });

  throws('if wrong total chunk', () => {
    given().withFile(file1Path, 1, [fileData1, fileData2]).init().uploadAll();
  });

  test('upload some files with global Metadata', () => {
    const myUpload = given()
      .withGlobalMetadata('version', '1.0.0')
      .withGlobalMetadata('isReady', '0')
      .withFile(file1Path, 2, [fileData1, fileData2])
      .withFile(file2Path, 1, [fileData2])
      .withFile(file3Path, 2, [fileData3, fileData4])
      .withFile(file4Path, 1, [fileData4])
      .init()
      .uploadAll();

    checkThat(myUpload).hasUploadedFiles().hasGlobalMetadata();
  });

  test('upload some files with file Metadata', () => {
    const myUpload = given()
      .withFile(
        file1Path,
        2,
        [fileData1, fileData2],
        [
          new Metadata(metadataKey1, metadataValue1),
          new Metadata(metadataKey2, metadataValue2),
        ],
      )
      .init()
      .uploadAll();

    checkThat(myUpload).hasUploadedFiles().hasMetadata();
  });

  test('upload some files then upload a new version', () => {
    given()
      .withFile(
        file1Path,
        2,
        [fileData1, fileData2],
        [
          new Metadata(metadataKey1, metadataValue1),
          new Metadata(metadataKey2, metadataValue2),
        ],
      )
      .withFile(file2Path, 1, [fileData2])
      .init()
      .uploadAll();

    const myUpdate = given()
      .withFile(file1Path, 1, [fileData1])
      .withFilesToDelete([file2Path])
      .init()
      .uploadAll();

    checkThat(myUpdate)
      .hasUploadedFiles()
      .hasMetadata()
      .hasTheRightNumberOfFiles()
      .hasTheRightNumberOfChunks();
  });
});
