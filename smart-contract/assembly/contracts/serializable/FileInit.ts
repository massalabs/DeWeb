import { Args, Result } from '@massalabs/as-types';
import { Serializable } from '@massalabs/as-types/assembly/serializable';
import { Metadata } from './Metadata';

export class FileInit implements Serializable {
  /**
   * Creates a new FileInit instance.
   * @param location - The location of the file this chunk belongs to.
   * @param hashLocation - The hash of the file location.
   * @param totalChunk - The total number of chunks of the file.
   * @param metadata - The metadata of the file.
   */
  constructor(
    public location: string = '',
    public hashLocation: StaticArray<u8> = [],
    public totalChunk: u32 = 0,
    public metadata: Metadata[] = [],
  ) {}

  serialize(): StaticArray<u8> {
    return new Args()
      .add(this.location)
      .add(this.hashLocation)
      .add(this.totalChunk)
      .addSerializableObjectArray(this.metadata)
      .serialize();
  }

  deserialize(data: StaticArray<u8>, offset: i32): Result<i32> {
    const args = new Args(data, offset);

    const location = args.next<string>();
    if (location.error) {
      return new Result(args.offset);
    }

    const hashLocation = args.next<StaticArray<u8>>();
    if (hashLocation.error) {
      return new Result(args.offset);
    }

    const totalChunk = args.next<u32>();
    if (totalChunk.error) {
      return new Result(args.offset);
    }

    const metadata = args.nextSerializableObjectArray<Metadata>();
    if (metadata.error) {
      return new Result(args.offset);
    }

    this.location = location.unwrap();
    this.hashLocation = hashLocation.unwrap();
    this.totalChunk = totalChunk.unwrap();
    this.metadata = metadata.unwrap();

    return new Result(args.offset);
  }
}
