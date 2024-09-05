import { ConstantManager, KeyIncrementer } from '@massalabs/massa-as-sdk';
const k = new KeyIncrementer();
export const FILE_TAG = k.nextKey();
export const CHUNK_TAG = k.nextKey();
export const CHUNK_NB_TAG = k.nextKey();
export const METADATA_TAG = k.nextKey();
export const MAX_STORAGE_VALUE_SIZE = k.nextKey();
export const FILES_PATH_LIST = new ConstantManager<Array<string>, u8>(k);
