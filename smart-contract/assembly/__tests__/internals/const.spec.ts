import {
  FILE_TAG,
  CHUNK_TAG,
  CHUNK_NB_TAG,
  METADATA_TAG,
  MAX_STORAGE_VALUE_SIZE,
  FILES_PATH_LIST,
} from '../../contracts/internals/const';

describe('Constants Tests', () => {
  test('FILE_TAG should be 0', () => {
    expect(FILE_TAG).toStrictEqual([0]);
  });

  test('CHUNK_TAG should be 1', () => {
    expect(CHUNK_TAG).toStrictEqual([1]);
  });

  test('CHUNK_NB_TAG should be 2', () => {
    expect(CHUNK_NB_TAG).toStrictEqual([2]);
  });

  test('METADATA_TAG should be 3', () => {
    expect(METADATA_TAG).toStrictEqual([3]);
  });

  test('MAX_STORAGE_VALUE_SIZE should be 4', () => {
    expect(MAX_STORAGE_VALUE_SIZE).toStrictEqual([4]);
  });

  test('FILES_PATH_LIST should use key 5', () => {
    expect(FILES_PATH_LIST.key).toStrictEqual([5]);
  });
});
