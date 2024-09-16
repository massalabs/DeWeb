import { Args, DeserializedResult, Serializable } from '@massalabs/massa-web3';

export class ChunkPost implements Serializable<ChunkPost> {
  constructor(
    public filePath: string = '',
    public id: bigint = 0n,
    public data: Uint8Array = new Uint8Array(0),
    public totalChunks: bigint = 1n,
  ) {}

  serialize(): Uint8Array {
    return new Args()
      .addString(this.filePath)
      .addU32(this.id)
      .addUint8Array(this.data)
      .addU32(this.totalChunks)
      .serialize();
  }

  deserialize(data: Uint8Array, offset: number): DeserializedResult<ChunkPost> {
    const args = new Args(data, offset);
    this.filePath = args.nextString();
    this.id = args.nextU32();
    this.data = args.nextUint8Array();
    this.totalChunks = args.nextU32();

    return { instance: this, offset: args.getOffset() };
  }
}

export class ChunkGet implements Serializable<ChunkGet> {
  constructor(
    public filePathHash: Uint8Array = new Uint8Array(0),
    public id: bigint = 0n,
  ) {}

  serialize(): Uint8Array {
    return new Args()
      .addUint8Array(this.filePathHash)
      .addU32(this.id)
      .serialize();
  }

  deserialize(data: Uint8Array, offset: number): DeserializedResult<ChunkGet> {
    const args = new Args(data, offset);

    this.filePathHash = args.nextUint8Array();
    this.id = args.nextU32();

    return { instance: this, offset: args.getOffset() };
  }
}
