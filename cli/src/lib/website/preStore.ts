import {
  Args,
  bytes,
  DeserializedResult,
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

export async function preStoreChunks(sc: SmartContract, chunks: PreStore[]) {
  const coins = await preStoreCost(sc, chunks)

  return await sc.call(
    'preStoreFileChunks',
    new Args().addSerializableObjectArray(chunks).serialize(),
    {
      coins: coins,
    }
  )
}

// TODO: Improve estimation
// - Deleted files reduce the cost
// - Removing chunks releases some coins
export async function preStoreCost(
  sc: SmartContract,
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
