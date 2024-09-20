import {
  Args,
  MAX_GAS_CALL,
  minBigInt,
  Operation,
  SmartContract,
} from '@massalabs/massa-web3'
import { computeChunkCost } from './chunk'
import { UploadBatch } from '../uploadManager'
import { Batch } from '../batcher'

export async function uploadChunks(
  sc: SmartContract,
  batch: UploadBatch
): Promise<Operation> {
  const { args, coins } = makeArgsCoinsFromBatch(batch)

  return sc.call('storeFileChunks', args, {
    coins: coins,
    maxGas: batch.gas,
  })
}

/**
 * Estimate the gas cost for a batch
 * @param sc - SmartContract instance
 * @param batch - the batch to estimate gas for
 * @returns the estimated gas cost
 */
export async function estimateBatchGas(
  sc: SmartContract,
  batch: Batch
): Promise<bigint> {
  const { args, coins } = makeArgsCoinsFromBatch(batch)

  const result = await sc.read('storeFileChunks', args, {
    coins: coins,
  })
  if (result.info.error) {
    throw new Error(result.info.error)
  }
  const gasCost = BigInt(result.info.gasCost)
  return minBigInt(gasCost * 2n, MAX_GAS_CALL)
}

/**
 * Make args and coins from a batch
 * @param batch - the batch to make args and coins from
 * @returns the args and coins
 */
function makeArgsCoinsFromBatch(batch: Batch): {
  args: Args
  coins: bigint
} {
  const args = new Args().addSerializableObjectArray(batch.chunks)
  const coins = batch.chunks.reduce(
    (acc, chunk) =>
      acc +
      computeChunkCost(
        chunk.filePath,
        BigInt(chunk.chunkId),
        BigInt(chunk.data.length)
      ),
    0n
  )

  return { args, coins }
}
