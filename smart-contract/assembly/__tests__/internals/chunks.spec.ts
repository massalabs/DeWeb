import { resetStorage, sha256 } from '@massalabs/massa-as-sdk';
import {
  _setFileChunk,
  _getFileChunk,
  _getNbChunk,
} from '../../contracts/internals/chunks';
import { _getFilePathList } from '../../contracts/internals/file-list';
import { stringToBytes } from '@massalabs/as-types';

const fakeFile1Length = 10240;
const fakeFile1 = new StaticArray<u8>(fakeFile1Length).fill(1);
const fakeFile2Length = 10241;
const fakeFile2 = new StaticArray<u8>(fakeFile2Length).fill(1);
const file1 = 'file1';
const file2 = 'file2';
const file1Hash = sha256(stringToBytes(file1));
const file2Hash = sha256(stringToBytes(file2));

describe('website deployer internals functions tests', () => {
  describe('Store', () => {
    beforeEach(() => {
      resetStorage();
    });

    test('_setFileChunk', () => {
      _setFileChunk(file1, 0, fakeFile1, 1);

      const chunk = _getFileChunk(file1Hash, 0);
      expect(chunk.length).toBe(fakeFile1Length);
      expect(chunk).toStrictEqual(fakeFile1);

      const fileList = _getFilePathList();
      expect(fileList.length).toBe(1);
      expect(fileList[0]).toBe(file1);
    });

    test('Store 2 files', () => {
      _setFileChunk(file1, 0, fakeFile1, 1);
      _setFileChunk(file2, 0, fakeFile1, 1);

      const fileList = _getFilePathList();
      expect(fileList.length).toBe(2);
      expect(fileList[0]).toBe(file1);
      expect(fileList[1]).toBe(file2);
    });

    test('Store a file with 2 chunks', () => {
      _setFileChunk(file1, 0, fakeFile1, 1);
      _setFileChunk(file1, 1, fakeFile1, 2);

      const fileList = _getFilePathList();
      expect(fileList.length).toBe(1);
      expect(fileList[0]).toBe(file1);

      const nbChunk = _getNbChunk(file1Hash);
      expect(nbChunk).toBe(2);

      const chunk0 = _getFileChunk(file1Hash, 0);
      const chunk1 = _getFileChunk(file1Hash, 1);
      expect(chunk0.length).toBe(fakeFile1Length);
      expect(chunk1.length).toBe(fakeFile1Length);
    });

    test('Store 2 files with 2 chunks', () => {
      _setFileChunk(file1, 0, fakeFile1, 2);
      _setFileChunk(file1, 1, fakeFile1, 2);
      _setFileChunk(file2, 0, fakeFile1, 2);
      _setFileChunk(file2, 1, fakeFile1, 2);

      const fileList = _getFilePathList();
      expect(fileList.length).toBe(2);
      expect(fileList[0]).toBe(file1);
      expect(fileList[1]).toBe(file2);

      const nbChunk1 = _getNbChunk(file1Hash);
      expect(nbChunk1).toBe(2);
      const nbChunk2 = _getNbChunk(file2Hash);
      expect(nbChunk2).toBe(2);

      const chunk0 = _getFileChunk(file1Hash, 0);
      const chunk1 = _getFileChunk(file1Hash, 1);
      expect(chunk0.length).toBe(fakeFile1Length);
      expect(chunk1.length).toBe(fakeFile1Length);
      const chunk2 = _getFileChunk(file2Hash, 0);
      const chunk3 = _getFileChunk(file2Hash, 1);
      expect(chunk2.length).toBe(fakeFile1Length);
      expect(chunk3.length).toBe(fakeFile1Length);
    });

    test('Update a chunk', () => {
      _setFileChunk(file1, 0, fakeFile1, 1);
      _setFileChunk(file1, 0, fakeFile2, 1);
      const chunk = _getFileChunk(file1Hash, 0);
      expect(chunk.length).toBe(fakeFile2Length);
    });
  });
});
