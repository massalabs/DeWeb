import { stringToBytes } from '@massalabs/as-types';
import { sha256 } from '@massalabs/massa-as-sdk';
import { _getFileChunk, _setFileChunk } from '../../contracts/internals/chunks';
import { _getFilePathList } from '../../contracts/internals/file-list';

export function calculateTotalChunks(
  data: StaticArray<u8>,
  chunkSize: u32,
): u32 {
  return u32(Math.ceil(f64(data.length) / f64(chunkSize)));
}

export function createRandomByteArray(length: u32): StaticArray<u8> {
  const array = new StaticArray<u8>(length);
  for (let i: u32 = 0; i < length; i++) {
    array[i] = (Math.random() * 256) as u8;
  }

  return array;
}

export function storeFileInChunks(
  fileName: string,
  data: StaticArray<u8>,
  chunkSize: u32,
): void {
  const totalChunks = calculateTotalChunks(data, chunkSize);

  for (let i: u32 = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = u32(Math.min(f64(start + chunkSize), f64(data.length)));
    const chunk = StaticArray.fromArray(data.slice(start, end));
    _setFileChunk(fileName, i, chunk);
  }
}

export function verifyStoredFile(
  fileName: string,
  originalData: StaticArray<u8>,
  chunkSize: u32,
): void {
  const fileHash = sha256(stringToBytes(fileName));

  const shouldTotalChunks = calculateTotalChunks(originalData, chunkSize);

  let reconstructedData: StaticArray<u8> = [];
  for (let i: u32 = 0; i < shouldTotalChunks; i++) {
    const chunk = _getFileChunk(fileHash, i);

    reconstructedData = reconstructedData.concat(chunk);
  }

  expect(reconstructedData.length).toBe(originalData.length);

  for (let i = 0; i < originalData.length; i++) {
    expect(reconstructedData[i]).toBe(originalData[i]);
  }
}

export function verifyFilesInList(expectedFileNames: string[]): void {
  const fileList = _getFilePathList();
  expect(fileList.length).toBe(expectedFileNames.length);
  for (let i = 0; i < expectedFileNames.length; i++) {
    expect(fileList).toContain(expectedFileNames[i]);
  }
}
