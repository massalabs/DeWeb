import {
  getKeysPage,
  MAX_DATASTORE_KEYS_PAGE,
  resetStorage,
  setDeployContext,
  Storage,
} from '@massalabs/massa-as-sdk';
import { Args, bytesToString, stringToBytes } from '@massalabs/as-types';
import { constructor, syncVersion } from '../../contracts/deweb-interface';
import { DEWEB_VERSION_TAG } from '../../contracts/internals/storageKeys/tags';
import { Metadata } from '../../contracts/serializable/Metadata';
import { uploader } from './helpers/Uploader';
import {
  _assertFilesAreNotPresent,
  _assertFilesArePresent,
  _assertPurged,
  _deleteFiles,
  _purge,
} from './helpers/delete-file';

const user = 'AU12UBnqTHDQALpocVBnkPNy7y5CndUJQTLutaVDDFgMJcq5kQiKq';
const otherUser = 'AU122Em8qkqegdLb1eyH8rdkSCNEf7RZLeTJve4Q2inRPGiTJ2xNv';
const bigFile = 'big.bin';
const smallFile = 'small.html';

// More chunks than one page of datastore keys.
const BIG_FILE_CHUNKS = MAX_DATASTORE_KEYS_PAGE + 100;

function chunks(n: i32): StaticArray<u8>[] {
  const data: StaticArray<u8>[] = [];
  for (let i = 0; i < n; i++) {
    data.push([u8(i % 256)]);
  }
  return data;
}

function countKeys(): i32 {
  let count = 0;
  let keys = getKeysPage();
  while (keys.length > 0) {
    count += keys.length;
    keys = getKeysPage([], keys[keys.length - 1]);
  }
  return count;
}

describe('Datastore keys past one page', () => {
  beforeEach(() => {
    resetStorage();
    setDeployContext(user);
    constructor(new Args().serialize());
  });

  test('delete a file with more chunks than a keys page', () => {
    uploader()
      .withFile(bigFile, chunks(BIG_FILE_CHUNKS), [
        new Metadata('content-type', 'application/octet-stream'),
      ])
      .withFile(smallFile, chunks(1))
      .init()
      .uploadAll();

    _deleteFiles([bigFile]);

    _assertFilesAreNotPresent([bigFile]);
    _assertFilesArePresent([smallFile]);
  });

  test('re-initialize a file with more chunks than a keys page', () => {
    uploader().withFile(bigFile, chunks(BIG_FILE_CHUNKS)).init().uploadAll();
    const keysBefore = countKeys();

    // Initializing an existing file deletes its previous chunks first.
    uploader().withFile(bigFile, chunks(1)).init().uploadAll();

    expect(countKeys()).toBe(keysBefore - BIG_FILE_CHUNKS + 1);
    _assertFilesArePresent([bigFile]);
  });

  test('purge more keys than a keys page', () => {
    uploader()
      .withFile(bigFile, chunks(BIG_FILE_CHUNKS))
      .withFile(smallFile, chunks(1))
      .withGlobalMetadata('title', 'site')
      .init()
      .uploadAll();
    expect(countKeys()).toBeGreaterThan(MAX_DATASTORE_KEYS_PAGE);

    _purge();

    _assertPurged();
  });

  test('purge exactly one page of keys', () => {
    // The constructor stores the version and the owner: fill up to one full page.
    uploader()
      .withFile(bigFile, chunks(MAX_DATASTORE_KEYS_PAGE - 2 - 2 - countKeys()))
      .init()
      .uploadAll();
    expect(countKeys()).toBe(MAX_DATASTORE_KEYS_PAGE - 2);
    uploader().withFile(smallFile, chunks(0), [], 0).init();
    expect(countKeys()).toBe(MAX_DATASTORE_KEYS_PAGE);

    _purge();

    _assertPurged();
  });
});

describe('Contract version', () => {
  beforeEach(() => {
    resetStorage();
    setDeployContext(user);
    constructor(new Args().serialize());
  });

  test('the constructor stores the version', () => {
    expect(bytesToString(Storage.get(DEWEB_VERSION_TAG))).toBe('3');
  });

  test('syncVersion overwrites the stored version', () => {
    // A website deployed with an older contract, then upgraded.
    Storage.set(DEWEB_VERSION_TAG, stringToBytes('2'));

    syncVersion([]);

    expect(bytesToString(Storage.get(DEWEB_VERSION_TAG))).toBe('3');
  });

  test('syncVersion writes the version when it is missing', () => {
    Storage.del(DEWEB_VERSION_TAG);

    syncVersion([]);

    expect(bytesToString(Storage.get(DEWEB_VERSION_TAG))).toBe('3');
  });

  throws('syncVersion by another address than the owner', () => {
    setDeployContext(otherUser);
    syncVersion([]);
  });
});
