import { i32ToBytes, stringToBytes } from '@massalabs/as-types';
import { Address, Storage } from '@massalabs/massa-as-sdk';
import { OWNER_KEY } from '@massalabs/sc-standards/assembly/contracts/utils/ownership-internal';

export const INDEX_BY_OWNER_TAG = stringToBytes('\x00INDEX_BY_OWNER');

export const WEBSITE_ADDR_TO_OWNER_TAG = stringToBytes(
  '\x00WEBSITE_ADDR_TO_OWNER',
);

const OWNER_MAX_LENGTH = 100;

/**
 * Get the owner of the website address
 * @param address - The website address
 * @returns The owner of the website address
 */
export function getOwnerOf(address: Address): string {
  if (!Storage.hasOf(address, OWNER_KEY)) return '';

  const ownerValue = Storage.getOf(address, OWNER_KEY);
  if (ownerValue.length >= OWNER_MAX_LENGTH) return '';

  return ownerValue;
}

/**
 * Returns the base key for the owner's address.
 * @param address - The website address.
 * @returns The base key for the owner's address.
 */
export function _addressToOwnerBaseKey(address: string): StaticArray<u8> {
  return WEBSITE_ADDR_TO_OWNER_TAG.concat(i32ToBytes(address.length)).concat(
    stringToBytes(address),
  );
}

/**
 * Returns the base key for the owner's list of websites.
 * @param owner - The owner's address.
 * @returns The base key.
 */
export function _indexByOwnerBaseKey(owner: string): StaticArray<u8> {
  return INDEX_BY_OWNER_TAG.concat(i32ToBytes(owner.length)).concat(
    stringToBytes(owner),
  );
}
