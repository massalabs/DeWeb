import { resetStorage, setDeployContext } from '@massalabs/massa-as-sdk';
import { constructor } from '../../contracts/deweb-interface';
import { Args } from '@massalabs/as-types';
import { ensure, uploader } from './helpers/Uploader';
import { Metadata } from '../../contracts/serializable/Metadata';

import { _assertGlobalMetadataRemoved } from './helpers/file-metadata';
import { _assertFilesAreNotPresent } from './helpers/delete-file';
import { _assertFileChunkCountIsCorrect } from './helpers/upload-file';

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
      .withGlobalMetadata('version', '1.0.0')
      .withFile(
        file1Path,
        [fileData1, fileData2],
        [
          new Metadata(metadataKey1, metadataValue1),
          new Metadata(metadataKey2, metadataValue2),
        ],
      )
      .withFile(file2Path, [fileData2])
      .withFile(file3Path, [fileData3, fileData4])
      .withFile(file4Path, [fileData4])
      .init();

    ensure(myUpload)
      .hasGlobalMetadata()
      .hasFileMetadata()
      .hasTheRightChunkCount()
      .hasTheRightNumberOfFilesLocations();
  });

  test('Extra chunks should be removed from the last file if new version is smaller', () => {
    const myUpload = uploader()
      .withGlobalMetadata('version', '1.0.0')
      .withFile(file1Path, [fileData1, fileData2])
      .withFile(file2Path, [fileData2])
      .withFile(file3Path, [fileData2, fileData3, fileData4, fileData4])
      .withFile(file4Path, [fileData4])
      .init()
      .uploadAll();

    ensure(myUpload).hasUploadedFiles();

    const newVersion = '0.9.0';
    const myUpload2 = uploader()
      .withGlobalMetadata('version', newVersion)
      .withFile(file1Path, [fileData1])
      .withFile(file2Path, [fileData2])
      .withFile(file3Path, [fileData3])
      .withFile(file4Path, [fileData4])
      .init()
      .uploadAll();

    ensure(myUpload2).hasUploadedFiles();
    _assertFileChunkCountIsCorrect(file3Path, 1);
    // Here we want to assert that the last file has only one chunk
    // TODO Assert Uploaded chunks are corrects
  });

  test('init with global metadata to remove', () => {
    const myUpload = uploader()
      .withGlobalMetadata('version', '1.0.0')
      .withFile(file1Path, [fileData1, fileData2])
      .withFile(file2Path, [fileData2])
      .withFile(file3Path, [fileData3, fileData4])
      .withFile(file4Path, [fileData4])
      .init();

    ensure(myUpload).hasGlobalMetadata();

    uploader()
      .withGlobalMetadataToDelete('version')
      .withFile(file1Path, [fileData1])
      .withFile(file2Path, [fileData2])
      .withFile(file3Path, [fileData3])
      .withFile(file4Path, [fileData4])
      .init();

    _assertGlobalMetadataRemoved(['version']);
  });

  test('init with files to remove', () => {
    const myUpload = uploader()
      .withGlobalMetadata('version', '1.0.0')
      .withFile(file1Path, [fileData1, fileData2])
      .withFile(file2Path, [fileData2])
      .withFile(file3Path, [fileData3, fileData4])
      .withFile(file4Path, [fileData4])
      .init()
      .uploadAll();

    ensure(myUpload).hasUploadedFiles();

    uploader()
      .withFilesToDelete([file1Path, file2Path, file3Path])
      .init()
      .uploadAll();

    _assertFilesAreNotPresent([file1Path, file2Path, file3Path]);
  });
});
