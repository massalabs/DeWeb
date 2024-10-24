import {
  Args,
  Mas,
  MAX_GAS_CALL,
  MIN_GAS_CALL,
  minBigInt,
  Operation,
  SmartContract,
  strToBytes,
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
import { maxBigInt } from '../../tasks/utils'

const functionName = 'filesInit'
const batchSize = 20

/**
 * Divide the files, filesToDelete, metadatas, and metadatasToDelete into multiple batches
 * @param files - Array of FileInit instances
 * @param filesToDelete - Array of FileDelete instances
 * @param metadatas - Array of Metadata instances
 * @param metadatasToDelete - Array of Metadata instances to delete
 * @param batchSize - Maximum number of elements in each batch
 * @returns - Array of Batch instances
 */
function createBatches(
  files: FileInit[],
  filesToDelete: FileDelete[],
  metadatas: Metadata[],
  metadatasToDelete: Metadata[]
): Batch[] {
  const batches: Batch[] = []

  let currentBatch = new Batch([], [], [], [])

  const addBatch = () => {
    if (
      currentBatch.fileInits.length > 0 ||
      currentBatch.fileDeletes.length > 0 ||
      currentBatch.metadatas.length > 0 ||
      currentBatch.metadataDeletes.length > 0
    ) {
      batches.push(currentBatch)
      currentBatch = new Batch([], [], [], [])
    }
  }

  for (const file of files) {
    if (currentBatch.fileInits.length >= batchSize) {
      addBatch()
    }
    currentBatch.fileInits.push(file)
  }

  for (const fileDelete of filesToDelete) {
    if (currentBatch.fileDeletes.length >= batchSize) {
      addBatch()
    }
    currentBatch.fileDeletes.push(fileDelete)
  }

  for (const metadata of metadatas) {
    if (currentBatch.metadatas.length >= batchSize) {
      addBatch()
    }
    currentBatch.metadatas.push(metadata)
  }

  for (const metadataDelete of metadatasToDelete) {
    if (currentBatch.metadataDeletes.length >= batchSize) {
      addBatch()
    }
    currentBatch.metadataDeletes.push(metadataDelete)
  }

  addBatch()

  return batches
}

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
  const batches: Batch[] = createBatches(
    files,
    filesToDelete,
    metadatas,
    metadatasToDelete
  )

  const operations: Operation[] = []

  for (const batch of batches) {
    const coins = await batch.batchCost(sc)
    const gas = await batch.estimateGas(sc)
    const args = batch.serialize()

    const op = await sc.call(functionName, args, {
      coins: coins <= 0n ? 0n : coins,
      maxGas: gas,
      fee: gas > Mas.fromString('0.01') ? gas : Mas.fromString('0.01'),
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
        BigInt(globalMetadataKey(strToBytes(metadata.key)).length),
        BigInt(metadata.value.length + 4)
      )
    )
  }, 0n)

  const metadatasToDeleteCost = metadatasToDelete.reduce((acc, metadata) => {
    return (
      acc +
      storageCostForEntry(
        BigInt(globalMetadataKey(strToBytes(metadata.key)).length),
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
 * Estimate the gas cost for the prepare operation
 * Required until https://github.com/massalabs/massa/issues/4742 is fixed
 * @param sc - SmartContract instance
 * @param files - Array of FileInit instances
 * @param filesToDelete - Array of FileDelete instances
 * @param metadatas - Array of Metadata instances
 * @param metadatasToDelete - Array of Metadata instances to delete
 *
 * @returns - Estimated gas cost for the operation
 */
async function estimatePrepareGas(
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
    coins: coins <= 0n ? 0n : coins,
    maxGas: MAX_GAS_CALL,
  })
  if (result.info.error) {
    console.error(result.info)
    throw new Error(result.info.error)
  }

  const gasCost = BigInt(result.info.gasCost)
  const numberOfElements = BigInt(
    files.length +
      filesToDelete.length +
      metadatas.length +
      metadatasToDelete.length
  )

  return minBigInt(
    maxBigInt(gasCost * numberOfElements, MIN_GAS_CALL),
    MAX_GAS_CALL
  )
}

/**
 * Represents parameters for the filesInit function
 */
class Batch {
  constructor(
    public fileInits: FileInit[],
    public fileDeletes: FileDelete[],
    public metadatas: Metadata[],
    public metadataDeletes: Metadata[]
  ) {}

  serialize(): Uint8Array {
    return new Args()
      .addSerializableObjectArray(this.fileInits)
      .addSerializableObjectArray(this.fileDeletes)
      .addSerializableObjectArray(this.metadatas)
      .addSerializableObjectArray(this.metadataDeletes)
      .serialize()
  }

  batchCost(sc: SmartContract): Promise<bigint> {
    return filesInitCost(
      sc,
      this.fileInits,
      this.fileDeletes,
      this.metadatas,
      this.metadataDeletes
    )
  }

  estimateGas(sc: SmartContract): Promise<bigint> {
    return estimatePrepareGas(
      sc,
      this.fileInits,
      this.fileDeletes,
      this.metadatas,
      this.metadataDeletes
    )
  }
}
