import { Args, Operation, SmartContract } from '@massalabs/massa-web3'
import { Batch } from '../batcher'
import { computeChunkCost } from './chunk'

const functionName = 'uploadFileChunks'

/**
 * Upload chunks to the smart contract
 * @param sc - SmartContract instance
 * @param batch - the batch to upload
 * @returns the operation
 */
export async function uploadChunks(
  sc: SmartContract,
  batch: Batch
): Promise<Operation> {
  const coins = computeBatchUploadCost(batch)

  const args = new Args().addSerializableObjectArray(batch.chunks)

  return sc.call(functionName, args, {
    coins: coins,
  })
}

export function computeBatchUploadCost(batch: Batch): bigint {
  return batch.chunks.reduce(
    (acc, chunk) =>
      acc + computeChunkCost(chunk.location, BigInt(chunk.index), chunk.data),
    0n
  )
}
