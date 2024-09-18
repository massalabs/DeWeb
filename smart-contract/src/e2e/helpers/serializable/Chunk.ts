import { Args, DeserializedResult, Serializable } from '@massalabs/massa-web3';

export class ChunkPost implements Serializable<ChunkPost> {
  constructor(
    public filePath: string = '',
    public index: bigint = 0n,
    public data: Uint8Array = new Uint8Array(0),
  ) {}

  serialize(): Uint8Array {
    return new Args()
      .addString(this.filePath)
      .addU32(this.index)
      .addUint8Array(this.data)
      .serialize();
  }

  deserialize(data: Uint8Array, offset: number): DeserializedResult<ChunkPost> {
    const args = new Args(data, offset);
    this.filePath = args.nextString();
    this.index = args.nextU32();
    this.data = args.nextUint8Array();

    return { instance: this, offset: args.getOffset() };
  }
}

export class ChunkGet implements Serializable<ChunkGet> {
  constructor(
    public filePathHash: Uint8Array = new Uint8Array(0),
    public index: bigint = 0n,
  ) {}

  serialize(): Uint8Array {
    return new Args()
      .addUint8Array(this.filePathHash)
      .addU32(this.index)
      .serialize();
  }

  deserialize(data: Uint8Array, offset: number): DeserializedResult<ChunkGet> {
    const args = new Args(data, offset);

    this.filePathHash = args.nextUint8Array();
    this.index = args.nextU32();

    return { instance: this, offset: args.getOffset() };
  }
}
