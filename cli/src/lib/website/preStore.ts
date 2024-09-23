import {
  Args,
  bytes,
  DeserializedResult,
  Mas,
  MAX_GAS_CALL,
  minBigInt,
  Operation,
  Serializable,
  SmartContract,
  U32,
} from '@massalabs/massa-web3'
import { storageCostForEntry } from '../utils/storage'

export class PreStore implements Serializable<PreStore> {
  constructor(
    public filePath: string = '',
    public filePathHash: Uint8Array = new Uint8Array(0),
    public newTotalChunks: bigint = 0n
  ) {}

  serialize(): Uint8Array {
    return new Args()
      .addString(this.filePath)
      .addUint8Array(this.filePathHash)
      .addU32(this.newTotalChunks)
      .serialize()
  }

  deserialize(data: Uint8Array, offset: number): DeserializedResult<PreStore> {
    const args = new Args(data, offset)

    this.filePath = args.nextString()
    this.filePathHash = args.nextUint8Array()
    this.newTotalChunks = args.nextU32()

    return { instance: this, offset: args.getOffset() }
  }
}

export async function preStoreChunks(
  sc: SmartContract,
  chunks: PreStore[]
): Promise<Operation[]> {
  const batchSize = 20
  const chunkBatches = []
  const operations: Operation[] = []

  for (let i = 0; i < chunks.length; i += batchSize) {
    chunkBatches.push(chunks.slice(i, i + batchSize))
  }

  for (const batch of chunkBatches) {
    const coins = await preStoreCost(sc, batch)
    const gas = await estimatePrepareGas(sc, batch)
    const op = await sc.call(
      'preStoreFileChunks',
      new Args().addSerializableObjectArray(batch).serialize(),
      {
        coins: coins,
        maxGas: gas,
        fee:
          BigInt(gas) > BigInt(Mas.fromString('0.01'))
            ? BigInt(gas)
            : BigInt(Mas.fromString('0.01')),
      }
    )

    operations.push(op)
  }

  return operations
}

// TODO: Improve estimation
// - Deleted files reduce the cost
// - Removing chunks releases some coins
export async function preStoreCost(
  _: SmartContract,
  chunks: PreStore[]
): Promise<bigint> {
  const filePathListCost = bytes(
    chunks.reduce((acc, chunk) => {
      return acc + chunk.filePath.length + 4
    }, 0)
  )

  const storageCost = chunks.reduce((acc, chunk) => {
    return (
      acc +
      storageCostForEntry(
        1n + BigInt(chunk.filePathHash.length),
        BigInt(U32.SIZE_BYTE)
      )
    )
  }, 0n)

  return BigInt(filePathListCost + storageCost)
}

/**
 * Estimate the gas cost for the operation
 * Required until https://github.com/massalabs/massa/issues/4742 is fixed
 * @param sc - SmartContract instance
 * @param chunks - Array of PreStore instances
 * @returns - Estimated gas cost for the operation
 */
export async function estimatePrepareGas(
  sc: SmartContract,
  chunks: PreStore[]
): Promise<bigint> {
  const coins = await preStoreCost(sc, chunks)

  const result = await sc.read(
    'preStoreFileChunks',
    new Args().addSerializableObjectArray(chunks).serialize(),
    {
      coins: coins,
      maxGas: MAX_GAS_CALL,
    }
  )
  if (result.info.error) {
    throw new Error(result.info.error)
  }
  const gasCost = BigInt(result.info.gasCost)
  return minBigInt(gasCost * BigInt(chunks.length), MAX_GAS_CALL)
}
