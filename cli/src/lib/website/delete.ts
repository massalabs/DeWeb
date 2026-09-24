import { Args, ArrayTypes, SmartContract } from '@massalabs/massa-web3'

import {
  CallManager,
  CallStatus,
  CallUpdate,
  FunctionCall,
} from '../utils/callManager'

import { listFiles } from './read'
import { getGlobalMetadata } from './metadata'

import { FileDelete } from './models/FileDelete'
import { FileInit } from './models/FileInit'
import { Metadata } from './models/Metadata'

/**
 * Maximum number of files (or metadata keys) handled by a single operation.
 * Mirrors the batch size used by the upload path (`filesInit.ts`).
 */
export const deleteBatchSize = 32

/**
 * Number of delete operations sent concurrently. Mirrors the upload path.
 */
const maxConcurrentOps = 4

export interface DeleteProgress {
  sent: number
  succeeded: number
  failed: number
  total: number
}

/**
 * Prepares the data required to delete a website.
 * @param sc - The smart contract instance.
 * @returns An object containing the file deletes and global metadata.
 */
export async function prepareDeleteWebsite(sc: SmartContract): Promise<{
  fileDeletes: FileDelete[]
  globalMetadatas: Metadata[]
}> {
  const { files: filePaths, notFoundKeys } = await listFiles(
    sc.provider,
    sc.address
  )
  if (notFoundKeys.length > 0) {
    throw new Error(
      'Could not retrieve the file location value of some location storage keys: ' +
        notFoundKeys
    )
  }
  const globalMetadatas = await getGlobalMetadata(sc.provider, sc.address)

  const fileDeletes = filePaths.map((filePath) => new FileDelete(filePath))

  return { fileDeletes, globalMetadatas }
}

/**
 * Splits an array into chunks of at most `size` elements.
 */
function chunkArray<T>(items: T[], size: number): T[][] {
  const batches: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size))
  }
  return batches
}

/**
 * Builds the batched calls needed to delete the given files and global metadata.
 *
 * File deletions go through `filesInit` rather than `deleteFiles`: `deleteFiles`
 * asserts `_getTotalChunk(hashLocation) > 0` for every entry, so re-running it
 * over a batch that was already partially applied reverts the whole operation.
 * The `filesInit` delete path has no such assert and is idempotent, which makes
 * a failed batch safe to retry.
 */
export function buildDeleteCalls(
  sc: SmartContract,
  fileDeletes: FileDelete[],
  globalMetadatas: Metadata[]
): FunctionCall[] {
  const calls: FunctionCall[] = []

  for (const batch of chunkArray(fileDeletes, deleteBatchSize)) {
    calls.push({
      sc,
      functionName: 'filesInit',
      args: new Args()
        .addSerializableObjectArray<FileInit>([]) // files to initialize
        .addSerializableObjectArray<FileDelete>(batch) // files to delete
        .addSerializableObjectArray<Metadata>([]) // global metadata to set
        .addSerializableObjectArray<Metadata>([]), // global metadata to delete
      // Deleting only frees storage, so no coins are required.
      options: { coins: 0n },
    })
  }

  for (const batch of chunkArray(globalMetadatas, deleteBatchSize)) {
    calls.push({
      sc,
      functionName: 'removeMetadataGlobal',
      args: new Args().addArray(
        batch.map((m) => m.key),
        ArrayTypes.STRING
      ),
      options: { coins: 0n },
    })
  }

  return calls
}

/**
 * Deletes the website by removing files and global metadata, spreading the work
 * over several operations.
 *
 * A single operation cannot enumerate an arbitrarily large datastore: the
 * `get_keys` ABI refuses more than `max_datastore_entry_count` (100_000) entries
 * and materializes the whole key set in the module's memory. Sending every file
 * in one call therefore fails outright on a large website.
 *
 * @param sc - The smart contract instance.
 * @param fileDeletes - The files to delete.
 * @param globalMetadatas - The global metadata to delete.
 * @param onProgress - Optional callback reporting batch progress.
 */
export async function deleteWebsite(
  sc: SmartContract,
  fileDeletes: FileDelete[],
  globalMetadatas: Metadata[],
  onProgress?: (progress: DeleteProgress) => void
): Promise<void> {
  const calls = buildDeleteCalls(sc, fileDeletes, globalMetadatas)

  if (calls.length === 0) {
    return
  }

  const progress: DeleteProgress = {
    sent: 0,
    succeeded: 0,
    failed: 0,
    total: calls.length,
  }

  const callManager = new CallManager(calls, maxConcurrentOps)
  const failedCalls = await callManager.performCalls((update: CallUpdate) => {
    switch (update.status) {
      case CallStatus.Sent:
        progress.sent++
        break
      case CallStatus.Success:
        progress.succeeded++
        break
      case CallStatus.Error:
        progress.failed++
        break
    }
    onProgress?.(progress)
  })

  if (failedCalls.length > 0) {
    throw new Error(
      `${failedCalls.length} of ${calls.length} delete operations failed. ` +
        'Re-run the command to retry the remaining entries.'
    )
  }
}
