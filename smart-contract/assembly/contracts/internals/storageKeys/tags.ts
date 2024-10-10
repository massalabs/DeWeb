import { stringToBytes } from '@massalabs/as-types';

export const FILE_TAG: StaticArray<u8> = stringToBytes('\x01FILE');
export const FILE_LOCATION_TAG: StaticArray<u8> = stringToBytes('\x02LOCATION');
export const CHUNK_TAG: StaticArray<u8> = stringToBytes('\x03CHUNK');
export const CHUNK_NB_TAG: StaticArray<u8> = stringToBytes('\x04CHUNK_NB');
export const FILE_METADATA_TAG: StaticArray<u8> = stringToBytes('\x05FM');
export const GLOBAL_METADATA_TAG: StaticArray<u8> = stringToBytes('\x06GM');
export const DEWEB_VERSION_TAG = stringToBytes('\xFFDEWEB_VERSION');
