import { Args, stringToBytes } from '@massalabs/as-types';
import {
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

    const key = Storage.getKeys(stringToBytes(websiteOwner.toString()));
    expect(key).toHaveLength(1);
    expect(key[0]).toStrictEqual(
      stringToBytes(websiteOwner.toString()).concat(
        stringToBytes(websiteAddress.toString()),
      ),
    );
  });

  test('update website', () => {
    setOf(websiteAddress, OWNER_KEY, scOwner.toString());
    const args = new Args().add(websiteAddress).serialize();
    updateWebsite(args);

    const oldOwnerKeys = Storage.getKeys(
      stringToBytes(websiteOwner.toString()),
    );
    expect(oldOwnerKeys).toHaveLength(0);

    const newOwnerKeys = Storage.getKeys(stringToBytes(scOwner.toString()));
    expect(newOwnerKeys).toHaveLength(1);

    const websiteKeys = Storage.getKeys(
      stringToBytes(websiteAddress.toString()),
    );
    expect(websiteKeys).toHaveLength(1);
  });

  throws('if the address is not a website', () => {
    const args = new Args().add(scOwner).serialize();
    updateWebsite(args);
  });
});
