import { Args, DeserializedResult, Serializable } from '@massalabs/massa-web3';
import { Metadata } from './Metadata';

export class FileInit implements Serializable<FileInit> {
  constructor(
    public location: string = '',
    public totalChunk: bigint = 0n,
    public metadata: Metadata[] = [],
  ) {}

  serialize(): Uint8Array {
    return new Args()
      .addString(this.location)
      .addU32(this.totalChunk)
      .addSerializableObjectArray(this.metadata)
      .serialize();
  }

  deserialize(data: Uint8Array, offset: number): DeserializedResult<FileInit> {
    const args = new Args(data, offset);

    this.location = args.nextString();
    this.totalChunk = args.nextU32();
    this.metadata = args.nextSerializableObjectArray(Metadata);

    return { instance: this, offset: args.getOffset() };
  }
}
