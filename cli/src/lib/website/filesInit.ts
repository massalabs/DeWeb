import {
  Args,
  Operation,
  SmartContract,
  strToBytes,
  U32,
  StorageCost,
} from '@massalabs/massa-web3'

import {
  CallManager,
  CallStatus,
  CallUpdate,
  FunctionCall,
} from '../utils/callManager'
import { FileDelete } from './models/FileDelete'

import { FileInit } from './models/FileInit'
import { Metadata } from './models/Metadata'

import {
  fileChunkCountKey,
  fileLocationKey,
  globalMetadataKey,
} from './storageKeys'

const functionName = 'filesInit'
export const batchSize = 32

export function getFileInitBatchLen(
  files: FileInit[],
  filesToDelete: FileDelete[],
  metadatas: Metadata[],
  metadatasToDelete: Metadata[]
): number {
  const longestField = Math.max(
    files.length,
    filesToDelete.length,
    metadatas.length,
    metadatasToDelete.length
  )
  return Math.ceil(longestField / batchSize)
}

/**
 * Divide the files, filesToDelete, metadatas, and metadatasToDelete into multiple batches
 * @param files - Array of FileInit instances
 * @param filesToDelete - Array of FileDelete instances
 * @param metadatas - Array of Metadata instances
 * @param metadatasToDelete - Array of Metadata instances to delete
 * @param batchSize - Maximum number of elements in each batch
 * @returns - Array of Batch instances
 */
export function createBatches(
  files: FileInit[],
  filesToDelete: FileDelete[],
  metadatas: Metadata[],
  metadatasToDelete: Metadata[]
): Batch[] {
  const batches: Batch[] = []
  let fileInitIndex = 0
  let fileDeleteIndex = 0
  let metadataIndex = 0
  let metadataDeleteIndex = 0

  while (
    fileInitIndex < files.length ||
    fileDeleteIndex < filesToDelete.length ||
    metadataIndex < metadatas.length ||
    metadataDeleteIndex < metadatasToDelete.length
  ) {
    let currentBatch = new Batch([], [], [], [])

    while (
      currentBatch.fileInits.length < batchSize &&
      fileInitIndex < files.length
    ) {
      currentBatch.fileInits.push(files[fileInitIndex])
      fileInitIndex++
    }

    while (
      currentBatch.fileDeletes.length < batchSize &&
      fileDeleteIndex < filesToDelete.length
    ) {
      currentBatch.fileDeletes.push(filesToDelete[fileDeleteIndex])
      fileDeleteIndex++
    }

    while (
      currentBatch.metadatas.length < batchSize &&
      metadataIndex < metadatas.length
    ) {
      currentBatch.metadatas.push(metadatas[metadataIndex])
      metadataIndex++
    }

    while (
      currentBatch.metadataDeletes.length < batchSize &&
      metadataDeleteIndex < metadatasToDelete.length
    ) {
      currentBatch.metadataDeletes.push(metadatasToDelete[metadataDeleteIndex])
      metadataDeleteIndex++
    }

    batches.push(currentBatch)
  }

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
  metadatasToDelete: Metadata[]
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
    const args = batch.serialize()

    calls.push({
      sc,
      functionName,
      args,
      options: {
        coins: coins <= 0n ? 0n : coins,
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

/* TODO: Improve estimation
If a file is already stored, we don't need to send coins for its hash storage
PrepareCost compute all storage cost related to fileInit operation.
It doesn't check if the files and metadata are already stored in the smart contract.
 */
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
      StorageCost.datastoreEntry(
        fileLocationKey(chunk.hashLocation),
        strToBytes(chunk.location)
      )
    )
  }, 0n)

  const storageCost = files.reduce((acc, chunk) => {
    return (
      acc +
      StorageCost.datastoreEntry(
        fileChunkCountKey(chunk.hashLocation),
        U32.toBytes(0n)
      )
    )
  }, 0n)

  const filesToDeleteCost = filesToDelete.reduce((acc, chunk) => {
    return acc - StorageCost.datastoreEntry(chunk.hashLocation, U32.toBytes(0n))
  }, 0n)

  const metadatasCost = metadatas.reduce((acc, metadata) => {
    return (
      acc +
      StorageCost.datastoreEntry(
        globalMetadataKey(strToBytes(metadata.key)),
        metadata.value
      )
    )
  }, 0n)

  const metadatasToDeleteCost = metadatasToDelete.reduce((acc, metadata) => {
    return (
      acc -
      StorageCost.datastoreEntry(
        globalMetadataKey(strToBytes(metadata.key)),
        metadata.value
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
}
