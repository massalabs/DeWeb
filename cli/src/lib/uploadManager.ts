import {
  Operation,
  OperationStatus,
  SmartContract,
} from '@massalabs/massa-web3'

import { Batch } from '../lib/batcher'
import { uploadChunks } from '../lib/website/uploadChunk'

export interface UploadManagerOptions {
  maxConcurrentOps: number
}

export enum BatchStatus {
  WaitingUpload = 0,
  Sent = 1,
  Success = 2,
  Error = 3,
}

export interface UploadBatch extends Batch {
  operation?: Operation
  status: BatchStatus
  gas: bigint
}

export class UploadManager {
  private batches: UploadBatch[]
  private maxConcurrentOps: number
  private operations: Operation[] = []

  constructor(
    batchedChunks: UploadBatch[],
    options: UploadManagerOptions = { maxConcurrentOps: 1 }
  ) {
    this.batches = batchedChunks.map((batch, index) => ({
      ...batch,
      id: index,
      status: BatchStatus.WaitingUpload,
    }))
    this.maxConcurrentOps = options.maxConcurrentOps
  }

  async startUpload(
    sc: SmartContract,
    onUpdate: (batch: UploadBatch) => void
  ): Promise<void> {
    const activeUploads: Promise<void>[] = []

    for (const batch of this.batches) {
      if (activeUploads.length >= this.maxConcurrentOps) {
        await Promise.race(activeUploads)
      }

      const uploadPromise = this.uploadBatch(batch, sc, onUpdate).finally(
        () => {
          const index = activeUploads.indexOf(uploadPromise)
          if (index > -1) activeUploads.splice(index, 1)
        }
      )

      activeUploads.push(uploadPromise)
    }

    await Promise.all(activeUploads)
  }

  private async uploadBatch(
    batch: UploadBatch,
    sc: SmartContract,
    onUpdate: (batch: UploadBatch) => void
  ): Promise<void> {
    batch.status = BatchStatus.Sent
    onUpdate(batch)

    try {
      const operation = await uploadChunks(sc, batch)
      batch.operation = operation
      this.operations.push(operation)

      const status = await operation.waitSpeculativeExecution()

      if (
        status === OperationStatus.Success ||
        status === OperationStatus.SpeculativeSuccess
      ) {
        batch.status = BatchStatus.Success
      } else if (
        status === OperationStatus.Error ||
        status === OperationStatus.SpeculativeError
      ) {
        batch.status = BatchStatus.Error
      }

      onUpdate(batch)
    } catch (error) {
      batch.status = BatchStatus.Error
      onUpdate(batch)
      console.error(`Error uploading batch ${batch.id}:`, error)
      throw error
    }
  }

  getBatches(): UploadBatch[] {
    return this.batches
  }

  getOperations(): Operation[] {
    return this.operations
  }
}
