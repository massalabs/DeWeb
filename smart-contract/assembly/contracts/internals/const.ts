import { ConstantManager, KeyIncrementer } from '@massalabs/massa-as-sdk';
const k = new KeyIncrementer();
export const FILE_TAG = k.nextKey(); // 0 as u8
export const CHUNK_TAG = k.nextKey(); // 1 as u8
export const CHUNK_NB_TAG = k.nextKey(); // 2 as u8
export const METADATA_TAG = k.nextKey(); // 3 as u8
export const MAX_STORAGE_VALUE_SIZE = k.nextKey(); // 4 as u8
export const FILES_PATH_LIST = new ConstantManager<Array<string>, u8>(k); // k will be 5 as u8
