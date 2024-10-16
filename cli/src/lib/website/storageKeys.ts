import { strToBytes, U32 } from '@massalabs/massa-web3'

export const FILE_TAG: Uint8Array = strToBytes('\x01FILE')
export const FILE_LOCATION_TAG: Uint8Array = strToBytes('\x02LOCATION')
export const CHUNK_TAG: Uint8Array = strToBytes('\x03CHUNK')
export const CHUNK_NB_TAG: Uint8Array = strToBytes('\x04CHUNK_NB')
export const FILE_METADATA_TAG: Uint8Array = strToBytes('\x05FM')
export const GLOBAL_METADATA_TAG: Uint8Array = strToBytes('\x06GM')
export const DEWEB_VERSION_TAG: Uint8Array = strToBytes('\xFFDEWEB_VERSION')

export function globalMetadataKey(metadataKey: Uint8Array): Uint8Array {
  const newKey = new Uint8Array(GLOBAL_METADATA_TAG.length + metadataKey.length)
  var offset = 0
  newKey.set(GLOBAL_METADATA_TAG, offset)
  offset += GLOBAL_METADATA_TAG.length
  newKey.set(metadataKey, offset)

  return newKey
}

export function fileMetadataKey(
  hashLocation: Uint8Array,
  metadataKey: Uint8Array = new Uint8Array()
): Uint8Array {
  const newKey = new Uint8Array(
    FILE_METADATA_TAG.length + hashLocation.length + metadataKey.length
  )
  var offset = 0
  newKey.set(FILE_METADATA_TAG, offset)
  offset += FILE_METADATA_TAG.length
  newKey.set(hashLocation, offset)
  offset += hashLocation.length
  newKey.set(metadataKey, offset)

  return newKey
}

export function fileLocationKey(hashLocation: Uint8Array): Uint8Array {
  const newKey = new Uint8Array(FILE_LOCATION_TAG.length + hashLocation.length)
  var offset = 0
  newKey.set(FILE_LOCATION_TAG, offset)
  offset += FILE_LOCATION_TAG.length
  newKey.set(hashLocation, offset)

  return newKey
}

export function fileChunkCountKey(hashLocation: Uint8Array): Uint8Array {
  const newKey = new Uint8Array(
    FILE_TAG.length + CHUNK_NB_TAG.length + hashLocation.length
  )
  var offset = 0
  newKey.set(FILE_TAG, offset)
  offset += FILE_TAG.length
  newKey.set(hashLocation, offset)
  offset += hashLocation.length
  newKey.set(CHUNK_NB_TAG, offset)

  return newKey
}

export function fileChunkKey(
  hashLocation: Uint8Array,
  index: bigint
): Uint8Array {
  const newKey = new Uint8Array(
    FILE_TAG.length + hashLocation.length + CHUNK_TAG.length + U32.SIZE_BYTE
  )

  var offset = 0
  newKey.set(FILE_TAG, offset)
  offset += FILE_TAG.length
  newKey.set(hashLocation, offset)
  offset += hashLocation.length
  newKey.set(CHUNK_TAG, offset)
  offset += CHUNK_TAG.length
  newKey.set(U32.toBytes(index), offset)

  return newKey
}
