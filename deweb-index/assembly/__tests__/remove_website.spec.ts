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
  removeWebsite,
  updateWebsite,
} from '../contracts/deweb-index';
import { _indexByOwnerBaseKey } from '../contracts/utils';

import { scOwner, version, websiteAddress, websiteOwner } from './const';

describe('removeWebsite tests', () => {
  beforeEach(() => {
    resetStorage();
    setDeployContext(scOwner.toString());
    setOf(websiteAddress, OWNER_KEY, websiteOwner.toString());
    setOf(websiteAddress, DEWEB_VERSION_TAG, stringToBytes(version));
    constructor([]);

    const args = new Args().add(websiteAddress).serialize();
    updateWebsite(args);
  });

  test('remove website', () => {
    const args = new Args().add(websiteAddress).serialize();
    removeWebsite(args);

    const key = Storage.getKeys(
      _indexByOwnerBaseKey(websiteOwner.toString()).concat(
        stringToBytes(websiteAddress.toString()),
      ),
    );
    expect(key).toHaveLength(0);
  });

  throws('if the caller is not the owner', () => {
    const args = new Args().add(websiteAddress).serialize();
    setDeployContext(websiteOwner.toString());
    removeWebsite(args);
  });
});
