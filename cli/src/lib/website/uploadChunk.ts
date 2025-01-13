import {
  Args,
  JsonRPCClient,
  MAX_GAS_CALL,
  minBigInt,
  Operation,
  Provider,
  ReadOnlyCallResult,
  ReadOnlyParams,
  SmartContract,
} from '@massalabs/massa-web3'
import { Batch } from '../batcher'
import { UploadBatch } from '../uploadManager'
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
  batch: UploadBatch
): Promise<Operation> {
  const { args, coins } = makeArgsCoinsFromBatch(batch)

  return sc.call(functionName, args, {
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

  const result = await sc.read(functionName, args, {
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
export function makeArgsCoinsFromBatch(batch: Batch): {
  args: Args
  coins: bigint
} {
  const args = new Args().addSerializableObjectArray(batch.chunks)
  const coins = batch.chunks.reduce(
    (acc, chunk) =>
      acc +
      computeChunkCost(
        chunk.location,
        BigInt(chunk.index),
        BigInt(chunk.data.length)
      ),
    0n
  )

  return { args, coins }
}

/**
 * Estimate the gas cost for each batch
 * @param provider - Provider instance
 * @param address - Address of the smart contract
 * @param batches - the batches to estimate gas for
 * @returns the list of UploadBatch with gas estimation
 */
export async function estimateUploadBatchesGas(
  provider: Provider,
  address: string,
  batches: UploadBatch[]
): Promise<UploadBatch[]> {
  const BATCH_SIZE = 5

  const nodeURL = (await provider.networkInfos()).url
  if (!nodeURL) {
    throw new Error('Node URL not found')
  }

  const client = new JsonRPCClient(nodeURL)

  const readOnlyCalls: ReadOnlyParams[] = batches.map((batch) => {
    const { args, coins } = makeArgsCoinsFromBatch(batch)
    return {
      coins: coins,
      maxGas: MAX_GAS_CALL,
      target: address,
      func: 'uploadFileChunks',
      parameter: args.serialize(),
      caller: provider.address,
      fee: undefined,
    }
  })

  const results: ReadOnlyCallResult[] = []

  for (let i = 0; i < readOnlyCalls.length; i += BATCH_SIZE) {
    const batch = readOnlyCalls.slice(i, i + BATCH_SIZE)
    const resp = await client.executeMultipleReadOnlyCall(batch)
    results.push(...resp)
  }

  return batches.map((batch, index) => {
    return {
      ...batch,
      gas: minBigInt(BigInt(results[index].info.gasCost) * 2n, MAX_GAS_CALL),
    }
  })
}
