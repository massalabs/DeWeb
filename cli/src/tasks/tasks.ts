import { Provider, SmartContract } from '@massalabs/massa-web3'

import { Batch } from '../lib/batcher'
import { FileChunkPost } from '../lib/website/models/FileChunkPost'
import { FileDelete } from '../lib/website/models/FileDelete'
import { FileInit } from '../lib/website/models/FileInit'
import { Metadata } from '../lib/website/models/Metadata'

/**
 * Estimated cost of an upload, in the smallest unit.
 */
export interface CostEstimation {
  /** SC deployment storage and operation fees (new website only) */
  deployment: bigint
  /** DeWeb Index registration storage (new website only) */
  index: bigint
  /** location and chunk count entries of the uploaded files */
  filesInit: bigint
  /** net cost of the global metadata changes, negative if storage is freed */
  metadatas: bigint
  /** storage freed by replacing and deleting on-chain files */
  freed: bigint
  /** storage of the uploaded chunks */
  chunks: bigint
  /** coins sent with the SC preparation operations, the excess is refunded */
  preparationCoins: bigint
  /** fees of the operations, besides the deployment */
  fees: bigint
  /** net cost of the upload: what the wallet balance will decrease by */
  total: bigint
  /** balance needed to send every operation, refunds are received later */
  requiredBalance: bigint
}

export interface UploadCtx {
  provider: Provider
  sc?: SmartContract

  noIndex: boolean
  skipIndexHtmlCheck: boolean
  skipConfirm: boolean
  websiteDirPath: string
  estimation?: CostEstimation

  chunks: FileChunkPost[]
  fileInits: FileInit[]
  filesToDelete: FileDelete[]
  metadatas: Metadata[]
  metadatasToDelete: Metadata[]
  /** global metadata currently stored on chain */
  onChainMetadatas: Metadata[]
  /** storage cost of the on-chain files replaced or deleted by the upload */
  freedStorageCost: bigint
  batches: Batch[]
  chunkSize: number
  minimalFees: bigint

  maxConcurrentOps: number
}

/**
 * Estimated cost of deleting a website, in the smallest unit.
 */
export interface DeleteEstimation {
  /** storage freed by deleting the files */
  files: bigint
  /** storage freed by deleting the global metadata */
  metadatas: bigint
  /** storage freed by the purge: remaining entries and bytecode (purge only) */
  purge: bigint
  /** coins held by the SC, sent back by its first call */
  scBalance: bigint
  /** fees of the operations */
  fees: bigint
  /** net cost of the deletion, negative for a refund */
  total: bigint
}

export interface DeleteCtx {
  provider: Provider
  sc: SmartContract
  purge: boolean
  noIndex: boolean

  fileDeletes: FileDelete[]
  globalMetadatas: Metadata[]

  skipConfirm: boolean

  minimalFees: bigint
  /** size of the SC bytecode, freed by a purge */
  scBytecodeSize: number
  estimation?: DeleteEstimation
}
