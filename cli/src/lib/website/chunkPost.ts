import { Args, DeserializedResult, Serializable } from '@massalabs/massa-web3'

export function toChunkPosts(
  filepath: string,
  chunks: Uint8Array[]
): ChunkPost[] {
  return chunks.map((chunk, index) => {
    return new ChunkPost(filepath, BigInt(index), chunk, BigInt(chunks.length))
  })
}

export class ChunkPost implements Serializable<ChunkPost> {
  constructor(
    public filePath: string = '',
    public chunkId: bigint = 0n,
    public data: Uint8Array = new Uint8Array(0),
    public totalChunks: bigint = 1n
  ) {}

  serialize(): Uint8Array {
    return new Args()
      .addString(this.filePath)
      .addU32(this.chunkId)
      .addUint8Array(this.data)
      .addU32(this.totalChunks)
      .serialize()
  }

  deserialize(data: Uint8Array, offset: number): DeserializedResult<ChunkPost> {
    const args = new Args(data, offset)
    this.filePath = args.nextString()
    this.chunkId = args.nextU32()
    this.data = args.nextUint8Array()
    this.totalChunks = args.nextU32()

    return { instance: this, offset: args.getOffset() }
  }
}
