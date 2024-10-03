import { Serializable, Args, Result } from '@massalabs/as-types';

export class FileDelete implements Serializable {
  /**
   * Creates a new ChunkPost instance.
   * @param location - The location of the file this chunk belongs to.
   * @param hashLocation - The hash of the file location.
   */
  constructor(public hashLocation: StaticArray<u8> = []) {}

  /**
   * Serializes the ChunkPost instance into a byte array.
   * @returns A StaticArray<u8> representing the serialized data.
   */
  serialize(): StaticArray<u8> {
    return new Args().add(this.hashLocation).serialize();
  }

  /**
   * Deserializes a byte array into a ChunkPost instance.
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

    this.hashLocation = hashLocation.unwrap();

    return new Result(args.offset);
  }
}
