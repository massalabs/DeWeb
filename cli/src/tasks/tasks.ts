import { SmartContract, Web3Provider } from '@massalabs/massa-web3'

import { Batch } from '../lib/batcher'
import { ChunkPost } from '../lib/website/chunkPost'
import { PreStore } from '../lib/website/preStore'

export interface UploadCtx {
  provider: Web3Provider
  sc?: SmartContract

  skipConfirm: boolean
  websiteDirPath: string
  currentTotalEstimation: bigint

  chunks: ChunkPost[]
  preStores: PreStore[]
  batches: Batch[]
  chunkSize: number
  minimalFees: bigint
}

export interface DeleteCtx {
  provider: Web3Provider
  sc?: SmartContract
  address: string
}
