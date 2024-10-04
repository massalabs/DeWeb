import { Serializable, Args, Result } from '@massalabs/as-types';

/**
 * Represents a chunk of data to be posted.
 * Implements the Serializable interface for encoding and decoding.
 */
export class FileChunkPost implements Serializable {
  /**
   * Creates a new FileChunkPost instance.
   * @param location - The location of the file this chunk belongs to.
   * @param index - The index of the chunk.
   * @param data - The data of the chunk.
   */
  constructor(
    public location: string = '',
    public index: u32 = 0,
    public data: StaticArray<u8> = [],
  ) {}

  serialize(): StaticArray<u8> {
    return new Args()
      .add(this.location)
      .add(this.index)
      .add(this.data)
      .serialize();
  }

  deserialize(data: StaticArray<u8>, offset: i32): Result<i32> {
    const args = new Args(data, offset);

    const location = args.next<string>();
    if (location.error) {
      return new Result(args.offset);
    }

    const index = args.next<u32>();
    if (index.error) {
      return new Result(args.offset);
    }

    const chunkData = args.next<StaticArray<u8>>();
    if (chunkData.error) {
      return new Result(args.offset);
    }

    this.location = location.unwrap();
    this.index = index.unwrap();
    this.data = chunkData.unwrap();

    return new Result(args.offset);
  }
}