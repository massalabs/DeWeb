import {
  FILE_METADATA_LOCATION_TAG,
  FILE_METADATA_TAG,
  GLOBAL_METADATA_TAG,
} from './tags';

/**
 * Generates the storage key for the global metadata.
 *
 * @param metadataKey - The key of the metadata.
 * @returns The storage key for the global metadata.
 *
 * @remarks
 * Storage representation: [GLOBAL_METADATA_TAG][metadataKey] = metadata_value
 */
export function globalMetadataKey(
  metadataKey: StaticArray<u8>,
): StaticArray<u8> {
  return GLOBAL_METADATA_TAG.concat(metadataKey);
}

/**
 * Generates the storage key for the file metadata.
 *
 * @param hashLocation - The hash of the file location.
 * @param metadataKey - The key of the metadata.
 * @returns The storage key for the file metadata.
 *
 * @remarks
 * Storage representation: [FILE_METADATA_TAG][hash(location)][metadataKey] = metadata_value
 */
export function fileMetadataKey(
  hashLocation: StaticArray<u8>,
  metadataKey: StaticArray<u8> = [],
): StaticArray<u8> {
  return FILE_METADATA_TAG.concat(hashLocation).concat(metadataKey);
}

/**
 * Generates the storage key for the file metadata location.
 *
 * @param hashLocation - The hash of the file location.
 * @returns The storage key for the file metadata location.
 *
 * @remarks
 * Storage representation: [FILE_METADATA_TAG][FILE_METADATA_LOCATION_TAG][hash(location)] = metadata_location
 */
export function fileMetadataLocationKey(
  hashLocation: StaticArray<u8>,
): StaticArray<u8> {
  // For the file metadata location, we want to prefix the key with the FILE_METADATA_LOCATION_TAG
  // so it's easier to find all the files
  return FILE_METADATA_TAG.concat(FILE_METADATA_LOCATION_TAG).concat(
    hashLocation,
  );
}
