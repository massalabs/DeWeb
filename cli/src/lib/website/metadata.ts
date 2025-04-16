import {
  Args,
  ArrayTypes,
  bytesToStr,
  Operation,
  Provider,
  PublicProvider,
  StorageCost,
} from '@massalabs/massa-web3'
import { Metadata } from './models/Metadata'
import {
  globalMetadataKey,
  GLOBAL_METADATA_TAG,
  fileMetadataKey,
  FILE_METADATA_TAG,
  FILE_TAG,
} from './storageKeys'
import { sha256 } from 'js-sha256'
import isEqual from 'lodash.isequal'

const SET_GLOBAL_METADATA_FUNCTION = 'setMetadataGlobal'
const REMOVE_GLOBAL_METADATA_FUNCTION = 'removeMetadataGlobal'
const SET_FILE_METADATA_FUNCTION = 'setMetadataFile'
const REMOVE_FILE_METADATA_FUNCTION = 'removeMetadataFile'

export const TITLE_METADATA_KEY = 'TITLE'
export const DESCRIPTION_METADATA_KEY = 'DESCRIPTION'
export const KEYWORD_METADATA_KEY_PREFIX = 'KEYWORD'
export const LAST_UPDATE_KEY = 'LAST_UPDATE'

export const HASH_LENGTH = 32

/**
 * Get the global metadata of a website stored on Massa blockchain
 * @param provider - Provider instance
 * @param address - Address of the website
 * @param prefix - Prefix of the metadata
 * @returns - List of Metadata objects
 */
export async function getGlobalMetadata(
  provider: PublicProvider,
  address: string,
  prefix: Uint8Array = new Uint8Array()
): Promise<Metadata[]> {
  const metadataKeys = await provider.getStorageKeys(
    address,
    globalMetadataKey(prefix)
  )
  const metadata = await provider.readStorage(address, metadataKeys, false)

  return metadata.map((m, index) => {
    const metadataKeyBytes = metadataKeys[index].slice(
      GLOBAL_METADATA_TAG.length
    )
    const key = bytesToStr(metadataKeyBytes)
    if (!m) {
      return new Metadata(key)
    }
    const value = bytesToStr(m)

    return new Metadata(key, value)
  })
}

export function fileHash(filePath: string): Uint8Array {
  return new Uint8Array(sha256.arrayBuffer(filePath))
}

export function fileHashHex(filePath: string): string {
  return sha256(filePath)
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Get the file metadata of a website stored on Massa blockchain
 * @param provider - Provider instance
 * @param address - Address of the website
 * @param filePath - file path to query metadata. if ommited, return metadata of all files
 * @param metadataKey - to query a specific metadata key only
 * @returns - List of Metadata objects for each file hash
 */
export async function getFileMetadata(
  provider: PublicProvider,
  address: string,
  filePath?: string,
  metadataKey: Uint8Array = new Uint8Array()
): Promise<Record<string, Metadata[]>> {
  let prefix = FILE_TAG
  if (filePath) {
    prefix = fileMetadataKey(fileHash(filePath), metadataKey)
  }

  const metadataKeys = await provider.getStorageKeys(address, prefix)

  // filter out keys that are not file metadata
  const fileMetadataTagStr = FILE_METADATA_TAG.join(',')
  const filteredKeys = metadataKeys.filter((key) => {
    const keyStr = key.join(',')
    return keyStr.includes(fileMetadataTagStr)
  })

  const metadataValues = await provider.readStorage(
    address,
    filteredKeys,
    false
  )

  return metadataValues.reduce(
    (acc, valueBytes, index) => {
      let offset = FILE_TAG.length
      const fileHashBytes = new Uint8Array(
        filteredKeys[index].slice(offset, offset + HASH_LENGTH)
      )

      offset += HASH_LENGTH
      const metadataTag = filteredKeys[index].slice(
        offset,
        offset + FILE_METADATA_TAG.length
      )

      if (!isEqual(metadataTag, FILE_METADATA_TAG)) {
        // its not a metadata key
        return acc
      }
      offset += FILE_METADATA_TAG.length
      const metadataKeyBytes = filteredKeys[index].slice(offset)
      const key = bytesToStr(metadataKeyBytes)

      let metadata: Metadata
      if (!valueBytes) {
        metadata = new Metadata(key)
      } else {
        const value = bytesToStr(valueBytes)
        metadata = new Metadata(key, value)
      }

      if (!acc[bytesToHex(fileHashBytes)]) {
        acc[bytesToHex(fileHashBytes)] = [metadata]
      } else {
        acc[bytesToHex(fileHashBytes)].push(metadata)
      }

      return acc
    },
    {} as Record<string, Metadata[]>
  )
}

export type ParsedMetadata = {
  title?: string
  description?: string
  keywords?: string[]
  lastUpdate?: string
  custom?: Record<string, string>
}

export function extractWebsiteMetadata(metadata: Metadata[]): ParsedMetadata {
  return metadata.reduce((acc, m) => {
    if (m.key === LAST_UPDATE_KEY) {
      acc.lastUpdate = m.value
    } else if (m.key === TITLE_METADATA_KEY) {
      acc.title = m.value
    } else if (m.key === DESCRIPTION_METADATA_KEY) {
      acc.description = m.value
    } else if (m.key.startsWith(KEYWORD_METADATA_KEY_PREFIX)) {
      if (!acc.keywords) {
        acc.keywords = []
      }
      acc.keywords.push(m.value)
    } else {
      if (!acc.custom) {
        acc.custom = {}
      }
      acc.custom[m.key] = m.value
    }
    return acc
  }, {} as ParsedMetadata)
}

/**
 * Returns the title, description and keywords of a website stored on Massa blockchain
 * Keywords are sorted alphabetically (keyword1, keyword2, keyword3, ...)
 * @param provider - Provider instance
 * @param address - Address of the website
 * @returns - An object with the title, description and keywords
 */
export async function getWebsiteMetadata(
  provider: PublicProvider,
  address: string
): Promise<ParsedMetadata> {
  const metadata = await getGlobalMetadata(provider, address)
  return extractWebsiteMetadata(metadata)
}

function setMetadataStorageCost(
  metadata: Metadata[],
  isGlobalMetadata = true
): bigint {
  const prefixLen = isGlobalMetadata
    ? GLOBAL_METADATA_TAG.length
    : FILE_TAG.length + HASH_LENGTH + FILE_METADATA_TAG.length
  return metadata.reduce(
    (sum, metadata) =>
      sum +
      StorageCost.bytes(prefixLen) +
      StorageCost.datastoreEntry(metadata.key, metadata.value),
    0n
  )
}

/**
 * Set a list of global metadata on a website stored on Massa blockchain
 * @param provider - Provider instance
 * @param address - Address of the website SC
 * @param metadatas - List of Metadata objects
 */
export async function setGlobalMetadata(
  provider: Provider,
  address: string,
  metadatas: Metadata[]
): Promise<Operation> {
  const args = new Args().addSerializableObjectArray(metadatas).serialize()

  return provider.callSC({
    target: address,
    func: SET_GLOBAL_METADATA_FUNCTION,
    parameter: args,
    coins: setMetadataStorageCost(metadatas),
  })
}

export async function setFileMetadata(
  provider: Provider,
  address: string,
  filePath: string,
  metadatas: Metadata[]
): Promise<Operation> {
  const args = new Args()
    .addUint8Array(fileHash(filePath))
    .addSerializableObjectArray(metadatas)
    .serialize()

  return provider.callSC({
    target: address,
    func: SET_FILE_METADATA_FUNCTION,
    parameter: args,
    coins: setMetadataStorageCost(metadatas, false),
  })
}

/**
 * Remove a list of global metadata keys on a website stored on Massa blockchain
 * @param provider - Provider instance
 * @param address - Address of the website SC
 * @param metadatas - List of Metadata keys
 */
export async function removeGlobalMetadata(
  provider: Provider,
  address: string,
  keys: string[]
): Promise<Operation> {
  const args = new Args().addArray(keys, ArrayTypes.STRING).serialize()

  return provider.callSC({
    target: address,
    func: REMOVE_GLOBAL_METADATA_FUNCTION,
    parameter: args,
  })
}

export async function removeFileMetadata(
  provider: Provider,
  address: string,
  filePath: string,
  keys: string[]
): Promise<Operation> {
  const args = new Args()
    .addUint8Array(fileHash(filePath))
    .addArray(keys, ArrayTypes.STRING)
    .serialize()

  return provider.callSC({
    target: address,
    func: REMOVE_FILE_METADATA_FUNCTION,
    parameter: args,
  })
}

function hasExactMetadata(
  metadata: Metadata[],
  key: string,
  value: string
): boolean {
  return metadata.some((m) => m.key === key && m.value === value)
}

export function hasMetadataKey(metadata: Metadata[], key: string): boolean {
  return metadata.some((m) => m.key === key)
}

/**
 * Divide a list of metadatas into metadatas that require to be updated or not
 * @param currentMetadatas - Current list of Metadata
 * @param newMetadatas - List of Metadata objects to compare
 * @returns - An object with the metadatas that require to be updated
 */
export async function filterMetadataToUpdate(
  currentMetadatas: Metadata[] | undefined,
  newMetadatas: Metadata[]
): Promise<Metadata[]> {
  if (!currentMetadatas || !currentMetadatas.length) {
    return newMetadatas
  }
  return newMetadatas.filter(
    (entry) => !hasExactMetadata(currentMetadatas, entry.key, entry.value)
  )
}
