import {
  Args,
  Mas,
  MAX_GAS_CALL,
  minBigInt,
  Operation,
  SmartContract,
  U32,
} from '@massalabs/massa-web3'
import { storageCostForEntry } from '../utils/storage'
import { FileInit } from './models/FileInit'
import { Metadata } from './models/Metadata'
import {
  fileChunkCountKey,
  fileLocationKey,
  globalMetadataKey,
} from './storageKeys'
import { FileDelete } from './models/FileDelete'

const functionName = 'filesInit'
const batchSize = 20

/**
 * Send the filesInits to the smart contract
 * @param sc - SmartContract instance
 * @param files - Array of FileInit instances
 * @param filesToDelete - Array of FileInit instances to delete
 * @param metadatas - Array of Metadata instances
 * @returns - Array of Operation instances
 */
export async function sendFilesInits(
  sc: SmartContract,
  files: FileInit[],
  filesToDelete: FileDelete[],
  metadatas: Metadata[],
  metadatasToDelete: Metadata[]
): Promise<Operation[]> {
  const chunkBatches: FileInit[][] = []
  const operations: Operation[] = []

  for (const file of files) {
    console.log(`File: ${file.location} -> ${file.totalChunk} chunks`)
  }

  for (let i = 0; i < files.length; i += batchSize) {
    chunkBatches.push(files.slice(i, i + batchSize))
  }

  for (const batch of chunkBatches) {
    const coins = await filesInitCost(
      sc,
      batch,
      filesToDelete,
      metadatas,
      metadatasToDelete
    )
    const gas = await estimatePrepareGas(
      sc,
      batch,
      filesToDelete,
      metadatas,
      metadatasToDelete
    )
    const args = new Args()
      .addSerializableObjectArray(batch)
      .addSerializableObjectArray(filesToDelete)
      .addSerializableObjectArray(metadatas)
      .addSerializableObjectArray(metadatasToDelete)
      .serialize()

    const op = await sc.call(functionName, args, {
      coins: coins,
      maxGas: gas,
      fee:
        BigInt(gas) > BigInt(Mas.fromString('0.01'))
          ? BigInt(gas)
          : BigInt(Mas.fromString('0.01')),
    })

    operations.push(op)
  }

  return operations
}

// TODO: Improve estimation
// - If a file is already stored, we don't need to send coins for its hash storage
export async function filesInitCost(
  _: SmartContract,
  files: FileInit[],
  filesToDelete: FileDelete[],
  metadatas: Metadata[],
  metadatasToDelete: Metadata[]
): Promise<bigint> {
  const filePathListCost = files.reduce((acc, chunk) => {
    return (
      acc +
      storageCostForEntry(
        BigInt(fileLocationKey(chunk.hashLocation).length),
        BigInt(chunk.location.length + 4)
      )
    )
  }, 0n)

  const storageCost = files.reduce((acc, chunk) => {
    return (
      acc +
      storageCostForEntry(
        BigInt(fileChunkCountKey(chunk.hashLocation).length),
        BigInt(U32.SIZE_BYTE)
      )
    )
  }, 0n)

  const filesToDeleteCost = filesToDelete.reduce((acc, chunk) => {
    return (
      acc +
      storageCostForEntry(
        1n + BigInt(chunk.hashLocation.length),
        BigInt(U32.SIZE_BYTE)
      )
    )
  }, 0n)

  const metadatasCost = metadatas.reduce((acc, metadata) => {
    return (
      acc +
      storageCostForEntry(
        BigInt(globalMetadataKey(metadata.key).length),
        BigInt(metadata.value.length + 4)
      )
    )
  }, 0n)

  const metadatasToDeleteCost = metadatasToDelete.reduce((acc, metadata) => {
    return (
      acc +
      storageCostForEntry(
        BigInt(globalMetadataKey(metadata.key).length),
        BigInt(metadata.value.length + 4)
      )
    )
  }, 0n)

  return BigInt(
    filePathListCost +
      storageCost +
      metadatasCost -
      filesToDeleteCost -
      metadatasToDeleteCost
  )
}

/**
 * Estimate the gas cost for the operation
 * Required until https://github.com/massalabs/massa/issues/4742 is fixed
 * @param sc - SmartContract instance
 * @param files - Array of PreStore instances
 * @returns - Estimated gas cost for the operation
 */
export async function estimatePrepareGas(
  sc: SmartContract,
  files: FileInit[],
  filesToDelete: FileDelete[],
  metadatas: Metadata[],
  metadatasToDelete: Metadata[]
): Promise<bigint> {
  const coins = await filesInitCost(
    sc,
    files,
    filesToDelete,
    metadatas,
    metadatasToDelete
  )
  const args = new Args()
    .addSerializableObjectArray(files)
    .addSerializableObjectArray(filesToDelete)
    .addSerializableObjectArray(metadatas)
    .addSerializableObjectArray(metadatasToDelete)
    .serialize()

  const result = await sc.read(functionName, args, {
    coins: coins,
    maxGas: MAX_GAS_CALL,
  })
  if (result.info.error) {
    throw new Error(result.info.error)
  }

  const gasCost = BigInt(result.info.gasCost)

  return minBigInt(gasCost * BigInt(files.length), MAX_GAS_CALL)
}
