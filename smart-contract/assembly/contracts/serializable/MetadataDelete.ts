import { Args, Result } from '@massalabs/as-types';
import { Serializable } from '@massalabs/as-types/assembly/serializable';

/**
 * Represents a request to delete a metadata entry.
 * Implements the Serializable interface for encoding and decoding.
 */
export class MetadataDelete implements Serializable {
  /**
   * Creates a new MetadataDelete instance.
   * @param key - The key of the metadata entry to be deleted.
   */
  constructor(public key: StaticArray<u8> = new StaticArray<u8>(0)) {}

  /**
   * Serializes the MetadataDelete instance into a byte array.
   * @returns A StaticArray<u8> representing the serialized data.
   */
  serialize(): StaticArray<u8> {
    return new Args().add(this.key).serialize();
  }

  /**
   * Deserializes a byte array into a MetadataDelete instance.
   * @param data - The byte array to deserialize.
   * @param offset - The starting offset in the byte array.
   * @returns A Result containing the new offset after deserialization.
   */
  deserialize(data: StaticArray<u8>, offset: i32): Result<i32> {
    const args = new Args(data, offset);

    const key = args.next<StaticArray<u8>>();
    if (key.error) {
      return new Result(args.offset);
    }

    this.key = key.unwrap();

    return new Result(args.offset);
  }
}
