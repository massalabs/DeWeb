import { Provider, SmartContract } from '@massalabs/massa-web3'
import { ListrLogger } from 'listr2'

import { Batch } from '../lib/batcher'
import { ChunkPost } from '../lib/website/chunkPost'

export interface UploadCtx {
  provider: Provider
  sc?: SmartContract
  logger: ListrLogger
  skipConfirm: boolean
  chunks: ChunkPost[]
  batches: Batch[]
  chunkSize: number
  websiteDirPath: string
  minimalFees: bigint
  currentTotalEstimation: bigint
}
