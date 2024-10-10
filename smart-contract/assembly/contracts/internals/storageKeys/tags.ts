import { stringToBytes } from '@massalabs/as-types';

export const FILE_TAG = stringToBytes('\x01FILE');
export const FILE_LOCATION_TAG = stringToBytes('\x02LOCATION');
export const CHUNK_TAG = stringToBytes('\x03CHUNK');
export const CHUNK_NB_TAG = stringToBytes('\x04CHUNK_NB');
export const FILE_METADATA_TAG = stringToBytes('\x05FM');
export const GLOBAL_METADATA_TAG = stringToBytes('\x06GM');
export const DEWEB_VERSION_TAG = stringToBytes('\xFFDEWEB_VERSION');
