import {
  Args,
  Mas,
  MAX_GAS_CALL,
  MIN_GAS_CALL,
  minBigInt,
  Operation,
  Provider,
  SmartContract,
  strToBytes,
  U32,
} from '@massalabs/massa-web3'

import {
  CallManager,
  CallStatus,
  CallUpdate,
  FunctionCall,
} from '../utils/callManager'
import { storageCostForEntry } from '../utils/storage'
import { maxBigInt } from '../utils/utils'
import { FileDelete } from './models/FileDelete'

import { FileInit } from './models/FileInit'
import { Metadata } from './models/Metadata'

import {
  FILE_TAG,
  fileChunkCountKey,
  fileLocationKey,
  globalMetadataKey,
} from './storageKeys'

const functionName = 'filesInit'
export const batchSize = 32

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
    if (Object.values(currentBatch).some((v) => v.length > 0)) {
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
 * @param filesToDelete - Array of FileDelete instances
 * @param metadatas - Array of Metadata instances
 * @param metadatasToDelete - Array of Metadata instances to delete
 * @returns - Array of Operation instances
 */
export async function sendFilesInits(
  sc: SmartContract,
  files: FileInit[],
  filesToDelete: FileDelete[],
  metadatas: Metadata[],
  metadatasToDelete: Metadata[],
  minimalFees: bigint = Mas.fromString('0.01')
): Promise<Operation[]> {
  const batches: Batch[] = createBatches(
    files,
    filesToDelete,
    metadatas,
    metadatasToDelete
  )

  const calls: FunctionCall[] = []
  const operations: Operation[] = []

  for (const batch of batches) {
    const coins = await batch.batchCost()
    const gas = await batch.estimateGas(sc)
    const args = batch.serialize()

    calls.push({
      sc,
      functionName: functionName,
      args,
      options: {
        coins: coins <= 0n ? 0n : coins,
        maxGas: gas,
        fee: gas > minimalFees ? gas : minimalFees,
      },
    })
  }

  const callManager = new CallManager(calls, 4)
  const failedCalls = await callManager.performCalls((status: CallUpdate) => {
    if (status.status === CallStatus.Error) {
      console.error('Call failed:', status.error)
    } else if (status.status === CallStatus.Sent && status.operation) {
      if (!operations.includes(status.operation)) {
        operations.push(status.operation)
      }
    }
  })

  if (failedCalls.length > 0) {
    console.error(`${failedCalls.length} calls failed`)
  }

  return operations
}

// TODO: Improve estimation
// - If a file is already stored, we don't need to send coins for its hash storage
export async function prepareCost(
  files: FileInit[],
  filesToDelete: FileDelete[],
  metadatas: Metadata[],
  metadatasToDelete: Metadata[]
): Promise<{
  filePathListCost: bigint
  storageCost: bigint
  filesToDeleteCost: bigint
  metadatasCost: bigint
  metadatasToDeleteCost: bigint
}> {
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

  return {
    filePathListCost,
    storageCost,
    filesToDeleteCost,
    metadatasCost,
    metadatasToDeleteCost,
  }
}

export async function filesInitCost(
  files: FileInit[],
  filesToDelete: FileDelete[],
  metadatas: Metadata[],
  metadatasToDelete: Metadata[]
): Promise<bigint> {
  const {
    filePathListCost,
    storageCost,
    filesToDeleteCost,
    metadatasCost,
    metadatasToDeleteCost,
  } = await prepareCost(files, filesToDelete, metadatas, metadatasToDelete)

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

  batchCost(): Promise<bigint> {
    return filesInitCost(
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

/**
 * Filter out pre-stores that are already stored on the blockchain
 * @param provider - the web3 provider
 * @param scAddress - the smart contract address
 * @param fileInits - the pre-stores to filter
 * @returns the pre-stores that are not stored on the blockchain
 */
export async function filterUselessFileInits(
  provider: Provider,
  scAddress: string,
  fileInits: FileInit[]
): Promise<FileInit[]> {
  const fileInitsWithKey = fileInits.map((preStore) => {
    return {
      preStore: preStore,
      totalChunkKey: fileChunkCountKey(preStore.hashLocation),
    }
  })

  const batches: {
    preStore: FileInit
    totalChunkKey: Uint8Array
  }[][] = []

  for (let i = 0; i < fileInitsWithKey.length; i += 100) {
    batches.push(fileInitsWithKey.slice(i, i + 100))
  }

  const fileInitsToKeep: FileInit[] = []

  for (const batch of batches) {
    const keys = await provider.getStorageKeys(scAddress, FILE_TAG)

    // Remove missing keys from the batch and add them to the list of files to keep
    for (let i = batch.length - 1; i >= 0; i--) {
      if (!keys.includes(batch[i].totalChunkKey)) {
        fileInitsToKeep.push(batch[i].preStore)
        batch.splice(i, 1)
      }
    }

    const results = await provider.readStorage(
      scAddress,
      batch.map((key) => key.totalChunkKey)
    )

    for (let i = 0; i < batch.length; i++) {
      if (!results[i]) {
        throw new Error(`Could not retrieve totalChunk data entry for file ${batch[i].preStore.location}`);
      }
      if (
        (results[i] as Uint8Array).length !== U32.SIZE_BYTE ||
        U32.fromBytes(results[i] as Uint8Array) !== batch[i].preStore.totalChunk
      ) {
        fileInitsToKeep.push(batch[i].preStore)
      }
    }
  }

  return fileInitsToKeep
}
