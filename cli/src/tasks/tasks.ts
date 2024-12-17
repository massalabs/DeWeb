import { Provider, SmartContract } from '@massalabs/massa-web3'

import { Batch } from '../lib/batcher'
import { FileChunkPost } from '../lib/website/models/FileChunkPost'
import { FileDelete } from '../lib/website/models/FileDelete'
import { FileInit } from '../lib/website/models/FileInit'
import { Metadata } from '../lib/website/models/Metadata'
import { UploadBatch } from '../lib/uploadManager'

export interface UploadCtx {
  provider: Provider
  sc?: SmartContract

  noIndex: boolean
  skipConfirm: boolean
  websiteDirPath: string
  currentTotalEstimation: bigint

  chunks: FileChunkPost[]
  fileInits: FileInit[]
  filesToDelete: FileDelete[]
  metadatas: Metadata[]
  metadatasToDelete: Metadata[]
  batches: Batch[]
  uploadBatches: UploadBatch[]
  chunkSize: number
  minimalFees: bigint

  maxConcurrentOps: number
}

export interface DeleteCtx {
  provider: Provider
  sc?: SmartContract
  address: string
}
