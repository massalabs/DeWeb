import { Args, bytesToString, stringToBytes } from '@massalabs/as-types';
import {
  Address,
  Context,
  setBytecode,
  Storage,
} from '@massalabs/massa-as-sdk';
import {
  _onlyOwner,
  _setOwner,
} from '@massalabs/sc-standards/assembly/contracts/utils/ownership-internal';
export {
  ownerAddress,
  setOwner
} from '@massalabs/sc-standards/assembly/contracts/utils/ownership';

import {
  _addressToOwnerBaseKey,
  _indexByOwnerBaseKey,
  getOwnerOf,
} from './utils';

export const DEWEB_VERSION_TAG = stringToBytes('\xFFDEWEB_VERSION');

/**
 * Initializes the smart contract.
 * Sets the contract deployer as the owner.
 */
export function constructor(_: StaticArray<u8>): void {
  assert(Context.isDeployingContract());

  _setOwner(Context.caller().toString());
}

/**
 * Upgrade the DNS smart contract bytecode
 * @param args - new bytecode
 * @returns void
 */
export function upgradeSC(args: StaticArray<u8>): void {
  _onlyOwner();

  setBytecode(args);
}

/**
 * Change the owner of the smart contract to the address passed as an argument
 * @param _binaryArgs - serialized arguments containing the new owner address
 * @returns void
 */
export function transferOwnership(_binaryArgs: StaticArray<u8>): void {
  _onlyOwner();

  const args = new Args(_binaryArgs);
  const newOwner = args
    .nextSerializable<Address>()
    .expect('Address is missing or invalid');

  _setOwner(newOwner.toString());
}

/**
 * Update the website address
 * @param _binaryArgs - serialized arguments containing the new address
 * @returns void
 */
export function updateWebsite(_binaryArgs: StaticArray<u8>): void {
  const args = new Args(_binaryArgs);
  const address = args
    .nextSerializable<Address>()
    .expect('Address is missing or invalid');

  _removeWebsite(address);

  if (!Storage.hasOf(address, DEWEB_VERSION_TAG)) return;

  const version = Storage.getOf(address, DEWEB_VERSION_TAG);
  if (version.length === 0) return;

  const owner = getOwnerOf(address);

  _addWebsite(address.toString(), owner);
}

/**
 * Remove the website address
 * @param _binaryArgs - serialized arguments containing the address
 * @returns void
 */
export function removeWebsite(_binaryArgs: StaticArray<u8>): void {
  _onlyOwner();

  const args = new Args(_binaryArgs);
  const address = args
    .nextSerializable<Address>()
    .expect('Address is missing or invalid');

  _removeWebsite(address);
}

/**
 * Entirely removes the website address from the storage.
 * @param address - The website address to remove.
 */
function _removeWebsite(address: Address): void {
  const prefix = _addressToOwnerBaseKey(address.toString());

  const keys = Storage.getKeys(prefix);
  for (let i = 0; i < keys.length; i++) {
    const owner = bytesToString(keys[i]).slice(prefix.length);

    if (owner.length > 0)
      _removeWebsiteFromOwnerEnumeration(owner, address.toString());

    Storage.del(keys[i]);
  }
}

/**
 * Adds the website address to the list of websites.
 * @param address - The website address.
 * @param owner - The owner's address.
 */
function _addWebsite(address: string, owner: string): void {
  const key = _addressToOwnerBaseKey(address).concat(stringToBytes(owner));

  Storage.set(key, []);

  if (owner.length > 0) _addWebsiteToOwnerEnumeration(owner, address);
}

/* -------------------------------------------------------------------------- */
/*                                OWNER WEBSITE                               */
/* -------------------------------------------------------------------------- */

/**
 * Adds a website address to the owner's list of websites.
 * @param owner - The owner's address.
 * @param websiteAddress - The website address to add.
 */
function _addWebsiteToOwnerEnumeration(
  owner: string,
  websiteAddress: string,
): void {
  const key = _indexByOwnerBaseKey(owner).concat(stringToBytes(websiteAddress));

  Storage.set(key, []);
}

/**
 * Removes a website address from the owner's list of websites.
 * @param owner - The owner's address.
 * @param websiteAddress - The website address to remove.
 */
function _removeWebsiteFromOwnerEnumeration(
  owner: string,
  websiteAddress: string,
): void {
  const key = _indexByOwnerBaseKey(owner).concat(stringToBytes(websiteAddress));

  if (!Storage.has(key)) return;

  Storage.del(key);
}
