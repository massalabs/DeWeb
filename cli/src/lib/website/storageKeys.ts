import { U32 } from '@massalabs/massa-web3'

export const FILE_TAG: Uint8Array = new Uint8Array([0])
export const FILE_LOCATION_TAG: Uint8Array = new Uint8Array([1])
export const CHUNK_TAG: Uint8Array = new Uint8Array([2])
export const CHUNK_NB_TAG: Uint8Array = new Uint8Array([3])
export const FILE_METADATA_TAG: Uint8Array = new Uint8Array([4])
export const GLOBAL_METADATA_TAG: Uint8Array = new Uint8Array([5])
export const FILE_METADATA_LOCATION_TAG: Uint8Array = new Uint8Array([6])
export const DEWEB_VERSION_TAG: Uint8Array = new Uint8Array(
  '\x42MASSA_DEWEB_VERSION'.split('').map((c) => c.charCodeAt(0))
)

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

export function fileMetadataLocationKey(hashLocation: Uint8Array): Uint8Array {
  const newKey = new Uint8Array(
    FILE_METADATA_LOCATION_TAG.length + hashLocation.length
  )
  var offset = 0
  newKey.set(FILE_METADATA_LOCATION_TAG, offset)
  offset += FILE_METADATA_LOCATION_TAG.length
  newKey.set(hashLocation, offset)

  // For the file metadata location, we want to prefix the key with the FILE_METADATA_LOCATION_TAG
  // so it's easier to find all the files
  return fileMetadataKey(newKey)
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
