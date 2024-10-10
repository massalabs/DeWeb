import { Serializable, Args, Result } from '@massalabs/as-types';

/**
 * Represents a request to get a specific chunk of data.
 * Implements the Serializable interface for encoding and decoding.
 */
export class FileChunkGet implements Serializable {
  /**
   * Creates a new FileChunkGet instance.
   * @param hashLocation - The hash of the file location.
   * @param index - The index of the chunk to retrieve.
   */
  constructor(
    public hashLocation: StaticArray<u8> = [],
    public index: u32 = 0,
  ) {}

  /**
   * Serializes the FileChunkGet instance into a byte array.
   * @returns A StaticArray<u8> representing the serialized data.
   */
  serialize(): StaticArray<u8> {
    return new Args().add(this.hashLocation).add(this.index).serialize();
  }

  /**
   * Deserializes a byte array into a FileChunkGet instance.
   * @param data - The byte array to deserialize.
   * @param offset - The starting offset in the byte array.
   * @returns A Result containing the new offset after deserialization.
   */
  deserialize(data: StaticArray<u8>, offset: i32): Result<i32> {
    const args = new Args(data, offset);

    const hashLocation = args.next<StaticArray<u8>>();
    if (hashLocation.error) {
      return new Result(args.offset);
    }

    const index = args.next<u32>();
    if (index.error) {
      return new Result(args.offset);
    }

    this.hashLocation = hashLocation.unwrap();
    this.index = index.unwrap();

    return new Result(args.offset);
  }
}
