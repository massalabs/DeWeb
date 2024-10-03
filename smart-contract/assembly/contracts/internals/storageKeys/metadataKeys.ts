import {
  FILE_METADATA_LOCATION_TAG,
  FILE_METADATA_TAG,
  GLOBAL_METADATA_TAG,
} from './tags';

export function globalMetadataKey(
  metadataKey: StaticArray<u8>,
): StaticArray<u8> {
  return GLOBAL_METADATA_TAG.concat(metadataKey);
}

export function fileMetadataKey(
  hashLocation: StaticArray<u8>,
  metadataKey: StaticArray<u8> = [],
): StaticArray<u8> {
  return FILE_METADATA_TAG.concat(hashLocation).concat(metadataKey);
}

export function fileMetadataLocationKey(
  hashLocation: StaticArray<u8>,
): StaticArray<u8> {
  // For the file metadata location, we want to prefix the key with the FILE_METADATA_LOCATION_TAG
  // so it's easier to find all the files
  return fileMetadataKey(FILE_METADATA_LOCATION_TAG.concat(hashLocation));
}
