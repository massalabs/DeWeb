import {
  Args,
  ArrayTypes,
  SmartContract,
  U32,
  Web3Provider,
} from '@massalabs/massa-web3'
import { sha256 } from 'js-sha256'
import { fileChunkCountKey, fileChunkKey } from './storageKeys'

/**
 * Lists files from the given website on Massa blockchain
 * @param sc - SmartContract instance
 * @returns List of file paths in the website
 */
export async function listFiles(sc: SmartContract): Promise<string[]> {
  const fileListRaw = await sc.read('getFileLocations', undefined)
  const fileListArgs = new Args(fileListRaw.value)

  return fileListArgs.nextArray(ArrayTypes.STRING)
}

/**
 * Get the total number of chunks for a file
 * @param sc - SmartContract instance
 * @param filePath - Path of the file to show
 * @returns Total number of chunks for the file
 */
export async function getFileTotalChunks(
  provider: Web3Provider,
  sc: SmartContract,
  filePath: string
): Promise<bigint> {
  const filePathHash = sha256.arrayBuffer(filePath)
  const fileTotalChunksResp = await provider.client.getDatastoreEntries([
    {
      address: sc.address,
      key: fileChunkCountKey(new Uint8Array(filePathHash)),
    },
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
 * @param provider - Web3Provider instance
 * @param sc - SmartContract instance
 * @param filePath - Path of the file to show
 * @returns - Uint8Array of the file content
 */
export async function getFileFromAddress(
  provider: Web3Provider,
  sc: SmartContract,
  filePath: string
): Promise<Uint8Array> {
  const filePathHash = sha256.arrayBuffer(filePath)
  const fileTotalChunks = await getFileTotalChunks(provider, sc, filePath)

  const datastoreKeys = []
  for (let i = 0n; i < fileTotalChunks; i++) {
    datastoreKeys.push(fileChunkKey(new Uint8Array(filePathHash), i))
  }

  const rawChunks = await provider.client.getDatastoreEntries(
    datastoreKeys.map((key) => {
      return {
        address: sc.address,
        key: key,
      }
    })
  )

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
