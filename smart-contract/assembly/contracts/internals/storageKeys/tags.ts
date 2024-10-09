import { stringToBytes } from '@massalabs/as-types';

export const FILE_TAG: StaticArray<u8> = stringToBytes('\x01MASSA_FILE');
export const FILE_LOCATION_TAG: StaticArray<u8> = stringToBytes(
  '\x02MASSA_FILE_LOCATION',
);
export const CHUNK_TAG: StaticArray<u8> = stringToBytes('\x03MASSA_CHUNK');
export const CHUNK_NB_TAG: StaticArray<u8> =
  stringToBytes('\x04MASSA_CHUNK_NB');
export const FILE_METADATA_TAG: StaticArray<u8> = stringToBytes(
  '\x05MASSA_FILE_METADATA',
);
export const GLOBAL_METADATA_TAG: StaticArray<u8> = stringToBytes(
  '\x06MASSA_GLOBAL_METADATA',
);
export const DEWEB_VERSION_TAG = stringToBytes('\x07MASSA_DEWEB_VERSION');
