import { bytesToStr, PublicProvider, U32 } from '@massalabs/massa-web3'
import { sha256 } from 'js-sha256'

import {
  FILE_LOCATION_TAG,
  fileChunkCountKey,
  fileChunkKey,
} from './storageKeys'
import { fileHash } from './metadata'

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
