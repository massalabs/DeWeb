import { Args, DeserializedResult, Serializable } from '@massalabs/massa-web3';

export class FileChunkGet implements Serializable<FileChunkGet> {
  constructor(
    public hashLocation: Uint8Array = new Uint8Array(0),
    public index: bigint = 0n,
  ) {}

  serialize(): Uint8Array {
    return new Args()
      .addUint8Array(this.hashLocation)
      .addU32(this.index)
      .serialize();
  }

  deserialize(
    data: Uint8Array,
    offset: number,
  ): DeserializedResult<FileChunkGet> {
    const args = new Args(data, offset);

    this.hashLocation = args.nextUint8Array();
    this.index = args.nextU32();

    return { instance: this, offset: args.getOffset() };
  }
}
