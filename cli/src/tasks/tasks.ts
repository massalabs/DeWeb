import { Provider, SmartContract } from '@massalabs/massa-web3'

import { Batch } from '../lib/batcher'
import { FileChunkPost } from '../lib/website/models/FileChunkPost'
import { FileDelete } from '../lib/website/models/FileDelete'
import { FileInit } from '../lib/website/models/FileInit'
import { Metadata } from '../lib/website/models/Metadata'

export interface UploadCtx {
  provider: Provider
  sc?: SmartContract

  skipConfirm: boolean
  websiteDirPath: string
  currentTotalEstimation: bigint

  chunks: FileChunkPost[]
  fileInits: FileInit[]
  filesToDelete: FileDelete[]
  metadatas: Metadata[]
  metadatasToDelete: Metadata[]
  batches: Batch[]
  chunkSize: number
  minimalFees: bigint
}

export interface DeleteCtx {
  provider: Provider
  sc?: SmartContract
  address: string
}
