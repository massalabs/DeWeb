import { MAX_DATASTORE_KEYS_PAGE, Storage } from '@massalabs/massa-as-sdk';

/**
 * Deletes every datastore entry whose key starts with `prefix`.
 *
 * From MIP-0002, one datastore-key call returns at most MAX_DATASTORE_KEYS_PAGE keys, so the keys are
 * read and deleted one page at a time. Deleted keys leave the datastore, so each page is read from the
 * start of the range again: no cursor is needed, and memory does not grow with the number of keys.
 * @param prefix - The prefix of the keys to delete. Empty deletes the whole datastore.
 */
export function _deleteKeysWithPrefix(prefix: StaticArray<u8>): void {
  let keys = Storage.getKeysPage(prefix);
  while (keys.length > 0) {
    for (let i = 0; i < keys.length; i++) {
      Storage.del(keys[i]);
    }
    // A short page means the range is exhausted.
    if (keys.length < MAX_DATASTORE_KEYS_PAGE) {
      break;
    }
    keys = Storage.getKeysPage(prefix);
  }
}
