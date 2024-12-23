import { Provider, U32 } from '@massalabs/massa-web3'
import { sha256 } from 'js-sha256'

import {
  FILE_LOCATION_TAG,
  fileChunkCountKey,
  fileChunkKey,
  globalMetadataKey,
} from './storageKeys'
import { Metadata } from './models/Metadata'

/**
 * Lists files from the given website on Massa blockchain
 * @param sc - SmartContract instance
 * @returns List of file paths in the website
 */
export async function listFiles(
  provider: Provider,
  scAddress: string
): Promise<string[]> {
  const allStorageKeys = await provider.getStorageKeys(
    scAddress,
    FILE_LOCATION_TAG
  )
  const fileLocations = await provider.readStorage(scAddress, allStorageKeys)

  return fileLocations.map((location) =>
    String.fromCharCode(...new Uint8Array(location))
  )
}

/**
 * Get the total number of chunks for a file
 * @param provider - Provider instance
 * @param scAddress - Address of the website smart contract
 * @param filePath - Path of the file to show
 * @returns Total number of chunks for the file
 */
export async function getFileTotalChunks(
  provider: Provider,
  scAddress: string,
  filePath: string
): Promise<bigint> {
  const filePathHash = sha256.arrayBuffer(filePath)
  const fileTotalChunksResp = await provider.readStorage(scAddress, [
    fileChunkCountKey(new Uint8Array(filePathHash)),
  ])

  if (fileTotalChunksResp.length !== 1) {
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
  provider: Provider,
  scAddress: string,
  filePath: string
): Promise<Uint8Array> {
  const filePathHash = sha256.arrayBuffer(filePath)
  const fileTotalChunks = await getFileTotalChunks(
    provider,
    scAddress,
    filePath
  )

  const datastoreKeys = []
  for (let i = 0n; i < fileTotalChunks; i++) {
    datastoreKeys.push(fileChunkKey(new Uint8Array(filePathHash), i))
  }

  const rawChunks = await provider.readStorage(scAddress, datastoreKeys)

  for (let i = 0; i < rawChunks.length; i++) {
    if (rawChunks[i].length === 0) {
      throw new Error(`file ${filePath} Chunk ${i} not found`)
    }
  }

  const totalLength = rawChunks.reduce((acc, chunk) => acc + chunk.length, 0)
  const concatenatedArray = new Uint8Array(totalLength)

  let offset = 0
  for (const chunk of rawChunks) {
    concatenatedArray.set(chunk, offset)
    offset += chunk.length
  }

  return concatenatedArray
}

/**
 * Get the metadata of a file from the given website on Massa blockchain
 * @param provider - Provider instance
 * @param address - Address of the website
 * @param prefix - Prefix of the metadata
 * @returns - List of Metadata objects
 */
export async function getGlobalMetadata(
  provider: Provider,
  address: string,
  prefix: Uint8Array = new Uint8Array()
): Promise<Metadata[]> {
  const metadataKeys = await provider.getStorageKeys(
    address,
    globalMetadataKey(prefix)
  )
  const metadata = await provider.readStorage(address, metadataKeys)

  return metadata.map((m, index) => {
    const metadataKeyBytes = metadataKeys[index].slice(
      globalMetadataKey(new Uint8Array()).length
    )
    const key = String.fromCharCode(...new Uint8Array(metadataKeyBytes))
    const value = String.fromCharCode(...new Uint8Array(m))

    return new Metadata(key, value)
  })
}
