import { resetStorage, setDeployContext } from '@massalabs/massa-as-sdk';
import { constructor } from '../../contracts/deweb-interface';
import { Args } from '@massalabs/as-types';
import { uploader } from './helpers/Uploader';
import {
  _assertFilesAreNotPresent,
  _assertFilesArePresent,
  _assertPurged,
  _deleteFiles,
  _purge,
  _assertHasNoCoins,
} from './helpers/delete-file';
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

  test('Remove some files', () => {
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
      .withFile(file3Path, [fileData3, fileData4])
      .withFile(file4Path, [fileData4])
      .init()
      .uploadAll();

    _deleteFiles([file1Path, file2Path, file3Path]);

    _assertFilesAreNotPresent([file1Path, file2Path, file3Path]);
    _assertFilesArePresent([file4Path]);
    _assertHasNoCoins();
  });

  throws('if try to remove a non-existing file', () => {
    _deleteFiles([file1Path]);
  });

  test('Remove initialized files but not uploaded', () => {
    uploader()
      .withFile(file1Path, [fileData1, fileData2])
      .withFile(file2Path, [fileData2])
      .withFile(file3Path, [fileData3, fileData4])
      .withFile(file4Path, [fileData4])
      .init();

    _deleteFiles([file1Path, file2Path, file3Path]);

    _assertFilesAreNotPresent([file1Path, file2Path, file3Path]);
    _assertFilesArePresent([file4Path]);
    _assertHasNoCoins();
  });

  test('Test purge', () => {
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
      .withFile(file3Path, [fileData3, fileData4])
      .withFile(file4Path, [fileData4])
      .init()
      .uploadAll();

    _purge();

    _assertPurged();
    _assertHasNoCoins();
  });
});
