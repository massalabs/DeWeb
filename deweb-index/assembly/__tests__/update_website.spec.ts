import { Args, stringToBytes } from '@massalabs/as-types';
import {
  deleteOf,
  resetStorage,
  setDeployContext,
  setOf,
  Storage,
} from '@massalabs/massa-as-sdk';
import { OWNER_KEY } from '@massalabs/sc-standards/assembly/contracts/utils/ownership-internal';

import {
  constructor,
  DEWEB_VERSION_TAG,
  updateWebsite,
} from '../contracts/deweb-index';
import {
  _addressToOwnerBaseKey,
  _indexByOwnerBaseKey,
} from '../contracts/utils';
import { scOwner, version, websiteAddress, websiteOwner } from './const';

describe('updateWebsite tests', () => {
  beforeEach(() => {
    resetStorage();
    setDeployContext(scOwner.toString());
    setOf(websiteAddress, OWNER_KEY, websiteOwner.toString());
    setOf(websiteAddress, DEWEB_VERSION_TAG, stringToBytes(version));
    constructor([]);
  });

  test('add website', () => {
    const args = new Args().add(websiteAddress).serialize();
    updateWebsite(args);

    const ownerPrefixKey = _indexByOwnerBaseKey(websiteOwner.toString());

    const ownerKeys = Storage.getKeys(ownerPrefixKey);
    expect(ownerKeys).toHaveLength(1, 'Expected one key for owner');
    expect(ownerKeys[0]).toStrictEqual(
      ownerPrefixKey.concat(stringToBytes(websiteAddress.toString())),
      'Owner keys',
    );

    const websitePrefixKey = _addressToOwnerBaseKey(websiteAddress.toString());

    const websiteKeys = Storage.getKeys(websitePrefixKey);

    expect(websiteKeys).toHaveLength(1, 'Expected one key for website');
    expect(websiteKeys[0]).toStrictEqual(
      websitePrefixKey.concat(stringToBytes(websiteOwner.toString())),
      'Website keys',
    );
  });

  test('add website without owner', () => {
    deleteOf(websiteAddress, OWNER_KEY);

    const args = new Args().add(websiteAddress).serialize();
    updateWebsite(args);

    const websitePrefixKey = _addressToOwnerBaseKey(websiteAddress.toString());

    const websiteKeys = Storage.getKeys(websitePrefixKey);
    expect(websiteKeys).toHaveLength(
      1,
      `Expected one key for website ${websiteAddress.toString()}`,
    );
    expect(websiteKeys[0]).toStrictEqual(websitePrefixKey, 'Website keys');
  });

  test('should update website owner', () => {
    setOf(websiteAddress, OWNER_KEY, scOwner.toString());
    const args = new Args().add(websiteAddress).serialize();
    updateWebsite(args);

    const oldOwnerPrefixKey = _indexByOwnerBaseKey(websiteOwner.toString());
    const oldOwnerKeys = Storage.getKeys(
      stringToBytes(oldOwnerPrefixKey.toString()),
    );
    expect(oldOwnerKeys).toHaveLength(0, 'Old owner keys should be empty');

    const newOwnerPrefixKey = _indexByOwnerBaseKey(scOwner.toString());

    const newOwnerKeys = Storage.getKeys(newOwnerPrefixKey);
    expect(newOwnerKeys).toHaveLength(1, 'New owner keys should have one key');

    const websitePrefixKey = _addressToOwnerBaseKey(websiteAddress.toString());

    const websiteKeys = Storage.getKeys(websitePrefixKey);
    expect(websiteKeys).toHaveLength(1, 'Website keys should have one key');
  });

  test('should do nothing if the address is not a website', () => {
    const args = new Args().add(scOwner).serialize();
    updateWebsite(args);

    const prefix = _addressToOwnerBaseKey(scOwner.toString());

    const websiteKeys = Storage.getKeys(prefix);
    expect(websiteKeys).toHaveLength(0);
  });

  test('should remove website if not a website anymore', () => {
    const args = new Args().add(websiteAddress).serialize();
    updateWebsite(args);

    const websitePrefixKey = _addressToOwnerBaseKey(websiteAddress.toString());

    const websiteKeys = Storage.getKeys(websitePrefixKey);
    expect(websiteKeys).toHaveLength(1, 'Website keys should have one key');

    deleteOf(websiteAddress, DEWEB_VERSION_TAG);
    updateWebsite(args);

    const updatedWebsiteKeys = Storage.getKeys(websitePrefixKey);
    expect(updatedWebsiteKeys).toHaveLength(0, 'Website keys should be empty');

    const ownerPrefixKey = _indexByOwnerBaseKey(websiteOwner.toString());
    const ownerKeys = Storage.getKeys(ownerPrefixKey);
    expect(ownerKeys).toHaveLength(0, 'Owner keys should be empty');
  });
});
