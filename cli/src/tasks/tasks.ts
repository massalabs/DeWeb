import { Provider, SmartContract } from '@massalabs/massa-web3'

import { Batch } from '../lib/batcher'
import { FileChunkPost } from '../lib/website/models/FileChunkPost'
import { FileInit } from '../lib/website/models/FileInit'

export interface UploadCtx {
  provider: Provider
  sc?: SmartContract

  skipConfirm: boolean
  websiteDirPath: string
  currentTotalEstimation: bigint

  chunks: FileChunkPost[]
  fileInits: FileInit[]
  batches: Batch[]
  chunkSize: number
  minimalFees: bigint
}

export interface DeleteCtx {
  provider: Provider
  sc?: SmartContract
  address: string
}
