import {
  bytesToStr,
  PublicProvider,
  StorageCost,
  U32,
} from '@massalabs/massa-web3'
import { sha256 } from 'js-sha256'

import {
  CHUNK_TAG,
  FILE_LOCATION_TAG,
  FILE_TAG,
  GLOBAL_METADATA_TAG,
  fileChunkCountKey,
  fileChunkKey,
  fileKey,
  fileLocationKey,
} from './storageKeys'
import { fileHash, HASH_LENGTH } from './metadata'

/**
 * Lists files from the given website on Massa blockchain
 * @param sc - SmartContract instance
 * @returns List of file paths in the website
 */
export async function listFiles(
  provider: PublicProvider,
  scAddress: string
): Promise<{ files: string[]; notFoundKeys: Uint8Array[] }> {
  const allStorageKeys = await provider.getStorageKeys(
    scAddress,
    FILE_LOCATION_TAG
  )
  const fileLocations = await provider.readStorage(
    scAddress,
    allStorageKeys,
    false
  )

  const files: string[] = []
  const notFoundKeys: Uint8Array[] = []

  fileLocations.forEach((location, i) => {
    if (!location) {
      notFoundKeys.push(allStorageKeys[i])
    } else {
      files.push(bytesToStr(location))
    }
  })

  return { files, notFoundKeys }
}

/**
 * Get the total number of chunks for a file
 * @param provider - Provider instance
 * @param scAddress - Address of the website smart contract
 * @param filePath - Path of the file to show
 * @returns Total number of chunks for the file
 */
export async function getFileTotalChunks(
  provider: PublicProvider,
  scAddress: string,
  filePath: string
): Promise<bigint> {
  const filePathHash = sha256.arrayBuffer(filePath)
  const fileTotalChunksResp = await provider.readStorage(
    scAddress,
    [fileChunkCountKey(new Uint8Array(filePathHash))],
    false
  )

  if (fileTotalChunksResp.length !== 1 || !fileTotalChunksResp[0]) {
    throw new Error('Invalid response from getDatastoreEntries')
  }

  const fileTotalChunksByteArray = fileTotalChunksResp[0]

  if (fileTotalChunksByteArray.length !== U32.SIZE_BYTE) {
    throw new Error(
      `Invalid length of fileTotalChunksByteArray, got ${fileTotalChunksByteArray.length}, expected ${U32.SIZE_BYTE}`
    )
  }

  return U32.fromBytes(fileTotalChunksByteArray)
}

/**
 * Get the content of a file from the given website on Massa blockchain
 * @param provider - Provider instance
 * @param scAddress - Address of the website smart contract
 * @param filePath - Path of the file to show
 * @returns - Uint8Array of the file content
 */
export async function getFileFromAddress(
  provider: PublicProvider,
  scAddress: string,
  filePath: string
): Promise<Uint8Array> {
  const filePathHash = fileHash(filePath)
  const fileTotalChunks = await getFileTotalChunks(
    provider,
    scAddress,
    filePath
  )

  const chunksKeys = []
  for (let i = 0n; i < fileTotalChunks; i++) {
    chunksKeys.push(fileChunkKey(filePathHash, i))
  }

  const fileChunks = await provider.readStorage(scAddress, chunksKeys, false)

  return fileChunks
    .filter((chunk) => !!chunk)
    .reduce(
      (acc, chunk) => Uint8Array.from([...acc, ...chunk]),
      new Uint8Array()
    )
}

/** Maximum number of datastore entries the node reads in one request */
const MAX_READ_STORAGE_KEYS = 128

/**
 * Read datastore entries, in as many requests as the node limit requires
 * @param provider - Provider instance
 * @param scAddress - Address of the smart contract
 * @param keys - the keys to read
 * @returns the values, null for a missing key
 */
export async function readStorageBatched(
  provider: PublicProvider,
  scAddress: string,
  keys: Uint8Array[]
): Promise<(Uint8Array | null)[]> {
  const values: (Uint8Array | null)[] = []
  for (let i = 0; i < keys.length; i += MAX_READ_STORAGE_KEYS) {
    values.push(
      ...(await provider.readStorage(
        scAddress,
        keys.slice(i, i + MAX_READ_STORAGE_KEYS),
        false
      ))
    )
  }
  return values
}

/**
 * Storage occupied by a website smart contract, by kind of entry
 */
export interface WebsiteStorage {
  /** entries of the registered files: location, chunk count, chunks, metadata */
  files: bigint
  /** global metadata entries */
  metadatas: bigint
  /** every other entry: owner, version, data of unregistered files */
  other: bigint
}

/**
 * Read every datastore entry of a website and compute the storage it occupies
 * @param provider - Provider instance
 * @param scAddress - Address of the website smart contract
 * @returns the storage cost of the website entries, by kind
 */
export async function getWebsiteStorage(
  provider: PublicProvider,
  scAddress: string
): Promise<WebsiteStorage> {
  const keys = await provider.getStorageKeys(scAddress, new Uint8Array(), false)
  const values = await readStorageBatched(provider, scAddress, keys)

  // Only the data of a registered file (with a location) is deleted with it
  const registered = new Set(
    keys
      .filter((key) => startsWith(key, FILE_LOCATION_TAG))
      .map((key) => key.slice(FILE_LOCATION_TAG.length).join(','))
  )

  const storage: WebsiteStorage = { files: 0n, metadatas: 0n, other: 0n }
  keys.forEach((key, i) => {
    const cost = StorageCost.datastoreEntry(key, values[i] ?? new Uint8Array())
    if (startsWith(key, FILE_LOCATION_TAG)) {
      storage.files += cost
    } else if (
      startsWith(key, FILE_TAG) &&
      registered.has(
        key.slice(FILE_TAG.length, FILE_TAG.length + HASH_LENGTH).join(',')
      )
    ) {
      storage.files += cost
    } else if (startsWith(key, GLOBAL_METADATA_TAG)) {
      storage.metadatas += cost
    } else {
      storage.other += cost
    }
  })
  return storage
}

/**
 * A file stored on a website smart contract, with the storage it occupies.
 */
export interface OnChainFile {
  /** the file content, assembled from its chunks */
  content: Uint8Array
  /**
   * the storage cost of every entry of the file: its location, chunk count,
   * chunks and metadata. This is what the SC frees when the file is deleted or
   * replaced.
   */
  storageCost: bigint
}

function startsWith(bytes: Uint8Array, prefix: Uint8Array): boolean {
  return bytes.length >= prefix.length && prefix.every((b, i) => bytes[i] === b)
}

/**
 * Read every storage entry of a file from the given website on Massa blockchain
 * @param provider - Provider instance
 * @param scAddress - Address of the website smart contract
 * @param filePath - Path of the file to read
 * @returns the file content and storage cost, or undefined if the file is not
 * registered in the website
 */
export async function getOnChainFile(
  provider: PublicProvider,
  scAddress: string,
  filePath: string
): Promise<OnChainFile | undefined> {
  const hash = fileHash(filePath)
  const locationKey = fileLocationKey(hash)

  const keys = await provider.getStorageKeys(scAddress, fileKey(hash), false)
  const [location, ...values] = await readStorageBatched(provider, scAddress, [
    locationKey,
    ...keys,
  ])

  // The SC only replaces the data of a file whose location is registered
  if (!location) {
    return undefined
  }

  let storageCost = StorageCost.datastoreEntry(locationKey, location)

  const countKey = fileChunkCountKey(hash)
  const chunkPrefix = new Uint8Array([...fileKey(hash), ...CHUNK_TAG])
  let totalChunks = 0n
  const chunks = new Map<bigint, Uint8Array>()

  keys.forEach((key, i) => {
    const value = values[i] ?? new Uint8Array()
    storageCost += StorageCost.datastoreEntry(key, value)

    if (key.length === countKey.length && startsWith(key, countKey)) {
      totalChunks = U32.fromBytes(value)
    } else if (
      key.length === chunkPrefix.length + U32.SIZE_BYTE &&
      startsWith(key, chunkPrefix)
    ) {
      chunks.set(U32.fromBytes(key.slice(chunkPrefix.length)), value)
    }
  })

  const parts: Uint8Array[] = []
  for (let i = 0n; i < totalChunks; i++) {
    const chunk = chunks.get(i)
    if (chunk) parts.push(chunk)
  }

  const content = new Uint8Array(
    parts.reduce((len, part) => len + part.length, 0)
  )
  let offset = 0
  for (const part of parts) {
    content.set(part, offset)
    offset += part.length
  }

  return { content, storageCost }
}
