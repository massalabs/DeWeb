import { stringToBytes } from '@massalabs/as-types';

export const FILE_TAG: StaticArray<u8> = [0];
export const FILE_LOCATION_TAG: StaticArray<u8> = [1];
export const CHUNK_TAG: StaticArray<u8> = [2];
export const CHUNK_NB_TAG: StaticArray<u8> = [3];
export const FILE_METADATA_TAG: StaticArray<u8> = [4];
export const GLOBAL_METADATA_TAG: StaticArray<u8> = [5];
export const FILE_METADATA_LOCATION_TAG: StaticArray<u8> = [6];
export const DEWEB_VERSION_TAG = stringToBytes('\x42MASSA_DEWEB_VERSION');
