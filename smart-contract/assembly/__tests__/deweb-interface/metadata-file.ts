import {
  resetStorage,
  setDeployContext,
  sha256,
} from '@massalabs/massa-as-sdk';
import { constructor } from '../../contracts/deweb-interface';
import { Args, stringToBytes } from '@massalabs/as-types';
import { uploader } from './helpers/Uploader';
import { Metadata } from '../../contracts/serializable/Metadata';
import {
  _addMetadataToFile,
  _assertMetadataAddedToFile,
  _assertMetadataRemovedFromFile,
  _removeMetadataFromFile,
} from './helpers/file-metadata';

const user = 'AU12UBnqTHDQALpocVBnkPNy7y5CndUJQTLutaVDDFgMJcq5kQiKq';
const file1Path = 'file1';
const hashFile1 = sha256(stringToBytes(file1Path));
const fileData1: StaticArray<u8> = [1, 2, 3, 4];
const metadataKey1 = stringToBytes('version');
const metadataValue1 = stringToBytes('1.0.0');
const metadata1 = new Metadata(metadataKey1, metadataValue1);

describe('File Metadata', () => {
  beforeEach(() => {
    resetStorage();
    setDeployContext(user);
    constructor(new Args().serialize());
  });

  test('Edit file metadata', () => {
    uploader().withFile(file1Path, [fileData1]).init().uploadAll();
    _addMetadataToFile(hashFile1, [metadata1]);
    _assertMetadataAddedToFile(hashFile1, [metadata1]);
  });

  throws('if try to edit metadata of non existing file', () => {
    _addMetadataToFile(hashFile1, [metadata1]);
  });

  test('Remove file metadata', () => {
    uploader().withFile(file1Path, [fileData1]).init().uploadAll();
    _addMetadataToFile(hashFile1, [metadata1]);
    _assertMetadataAddedToFile(hashFile1, [metadata1]);
    _removeMetadataFromFile(hashFile1, [metadata1]);
    _assertMetadataRemovedFromFile(hashFile1, [metadata1]);
  });

  throws('if try to remove metadata of non existing file', () => {
    _removeMetadataFromFile(hashFile1, [metadata1]);
  });

  throws('if try to remove non existing file metadata', () => {
    uploader().withFile(file1Path, [fileData1]).init().uploadAll();
    _removeMetadataFromFile(hashFile1, [metadata1]);
  });
});
