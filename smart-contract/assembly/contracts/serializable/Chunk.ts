import { Serializable, Args, Result } from '@massalabs/as-types';

/**
 * Represents a chunk of data to be posted.
 * Implements the Serializable interface for encoding and decoding.
 */
export class ChunkPost implements Serializable {
  /**
   * Creates a new ChunkPost instance.
   * @param filePath - The path of the file this chunk belongs to.
   * @param id - The unique identifier of this chunk within the file.
   * @param data - The actual data of the chunk.
   * @param totalChunks - The total number of chunks for the complete file.
   */
  constructor(
    public filePath: string = '',
    public id: u32 = 0,
    public data: StaticArray<u8> = [],
    public totalChunks: u32 = 1,
  ) {}

  /**
   * Serializes the ChunkPost instance into a byte array.
   * @returns A StaticArray<u8> representing the serialized data.
   */
  serialize(): StaticArray<u8> {
    return new Args()
      .add(this.filePath)
      .add(this.id)
      .add(this.data)
      .add(this.totalChunks)
      .serialize();
  }

  /**
   * Deserializes a byte array into a ChunkPost instance.
   * @param data - The byte array to deserialize.
   * @param offset - The starting offset in the byte array.
   * @returns A Result containing the new offset after deserialization.
   */
  deserialize(data: StaticArray<u8>, offset: i32): Result<i32> {
    const args = new Args(data, offset);

    const filePath = args.next<string>();
    if (filePath.error) {
      return new Result(args.offset);
    }

    const id = args.next<u32>();
    if (id.error) {
      return new Result(args.offset);
    }

    const chunkData = args.next<StaticArray<u8>>();
    if (chunkData.error) {
      return new Result(args.offset);
    }

    const totalChunks = args.next<u32>();
    if (totalChunks.error) {
      return new Result(args.offset);
    }

    this.filePath = filePath.unwrap();
    this.id = id.unwrap();
    this.data = chunkData.unwrap();
    this.totalChunks = totalChunks.unwrap();

    return new Result(args.offset);
  }
}

/**
 * Represents a request to get a specific chunk of data.
 * Implements the Serializable interface for encoding and decoding.
 */
export class ChunkGet implements Serializable {
  /**
   * Creates a new ChunkGet instance.
   * @param filePathHash - The hash of the file path.
   * @param id - The unique identifier of the chunk to retrieve.
   */
  constructor(public filePathHash: StaticArray<u8> = [], public id: u32 = 0) {}

  /**
   * Serializes the ChunkGet instance into a byte array.
   * @returns A StaticArray<u8> representing the serialized data.
   */
  serialize(): StaticArray<u8> {
    return new Args().add(this.filePathHash).add(this.id).serialize();
  }

  /**
   * Deserializes a byte array into a ChunkGet instance.
   * @param data - The byte array to deserialize.
   * @param offset - The starting offset in the byte array.
   * @returns A Result containing the new offset after deserialization.
   */
  deserialize(data: StaticArray<u8>, offset: i32): Result<i32> {
    const args = new Args(data, offset);

    const filePathHash = args.next<StaticArray<u8>>();
    if (filePathHash.error) {
      return new Result(args.offset);
    }

    const id = args.next<u32>();
    if (id.error) {
      return new Result(args.offset);
    }

    this.filePathHash = filePathHash.unwrap();
    this.id = id.unwrap();

    return new Result(args.offset);
  }
}
