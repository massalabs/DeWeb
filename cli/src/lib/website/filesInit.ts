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
import { chunkArray } from '../utils/utils'
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
  const fileInitChunks = chunkArray(files, batchSize)
  const fileDeleteChunks = chunkArray(filesToDelete, batchSize)
  const metadataChunks = chunkArray(metadatas, batchSize)
  const metadataDeleteChunks = chunkArray(metadatasToDelete, batchSize)

  const batchCount = Math.max(
    fileInitChunks.length,
    fileDeleteChunks.length,
    metadataChunks.length,
    metadataDeleteChunks.length
  )

  return Array.from(
    { length: batchCount },
    (_, i) =>
      new Batch(
        fileInitChunks[i] ?? [],
        fileDeleteChunks[i] ?? [],
        metadataChunks[i] ?? [],
        metadataDeleteChunks[i] ?? []
      )
  )
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

/**
 * Breakdown of the storage cost of a `filesInit` call.
 * Every field is a positive magnitude: the `*ToDeleteCost` entries are storage
 * that the call frees, not a negative amount to add.
 */
export interface PreparationCost {
  filePathListCost: bigint
  storageCost: bigint
  filesToDeleteCost: bigint
  metadatasCost: bigint
  metadatasToDeleteCost: bigint
}

/**
 * Nets a cost breakdown into the coins a `filesInit` call needs: the storage it
 * allocates minus the storage it frees. May be negative when the call frees more
 * than it allocates; callers that send coins must floor it at zero.
 * @param cost - the breakdown returned by `prepareCost`
 * @returns the net storage cost, in the smallest unit
 */
export function totalPreparationCost(cost: PreparationCost): bigint {
  return (
    cost.filePathListCost +
    cost.storageCost +
    cost.metadatasCost -
    cost.filesToDeleteCost -
    cost.metadatasToDeleteCost
  )
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
): Promise<PreparationCost> {
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

  // Storage freed by the deletions. Reported as a positive magnitude; callers
  // subtract it from the storage they need to pay for.
  const filesToDeleteCost = filesToDelete.reduce((acc, chunk) => {
    return acc + StorageCost.datastoreEntry(chunk.hashLocation, U32.toBytes(0n))
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
      acc +
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
  return totalPreparationCost(
    await prepareCost(files, filesToDelete, metadatas, metadatasToDelete)
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
