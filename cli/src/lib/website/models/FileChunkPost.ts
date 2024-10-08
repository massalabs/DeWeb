import { Args, DeserializedResult, Serializable } from '@massalabs/massa-web3'

export class FileChunkPost implements Serializable<FileChunkPost> {
  constructor(
    public location: string = '',
    public index: bigint = 0n,
    public data: Uint8Array = new Uint8Array(0)
  ) {}

  serialize(): Uint8Array {
    return new Args()
      .addString(this.location)
      .addU32(this.index)
      .addUint8Array(this.data)
      .serialize()
  }

  deserialize(
    data: Uint8Array,
    offset: number
  ): DeserializedResult<FileChunkPost> {
    const args = new Args(data, offset)
    this.location = args.nextString()
    this.index = args.nextU32()
    this.data = args.nextUint8Array()

    return { instance: this, offset: args.getOffset() }
  }
}
