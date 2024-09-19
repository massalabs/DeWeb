import { Provider, SmartContract } from '@massalabs/massa-web3'
import { ListrLogger } from 'listr2'

import { Batch } from '../lib/batcher'
import { ChunkPost } from '../lib/website/chunkPost'

export interface UploadCtx {
  provider: Provider
  sc?: SmartContract

  skipConfirm: boolean
  websiteDirPath: string
  currentTotalEstimation: bigint


  chunks: ChunkPost[]
  batches: Batch[]
  chunkSize: number
  minimalFees: bigint
}
