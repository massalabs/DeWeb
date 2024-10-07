import { Args, Result } from '@massalabs/as-types';
import { Serializable } from '@massalabs/as-types/assembly/serializable';

/**
 * Represents a key-value pair of metadata.
 * Implements the Serializable interface for encoding and decoding.
 */
export class Metadata implements Serializable {
  /**
   * Creates a new Metadata instance.
   * @param key - The key of the metadata entry.
   * @param value - The value of the metadata entry.
   */
  constructor(public key: string = '', public value: string = '') {}

  /**
   * Serializes the Metadata instance into a byte array.
   * @returns A StaticArray<u8> representing the serialized data.
   */
  serialize(): StaticArray<u8> {
    return new Args().add(this.key).add(this.value).serialize();
  }

  /**
   * Deserializes a byte array into a Metadata instance.
   * @param data - The byte array to deserialize.
   * @param offset - The starting offset in the byte array.
   * @returns A Result containing the new offset after deserialization.
   */
  deserialize(data: StaticArray<u8>, offset: i32): Result<i32> {
    const args = new Args(data, offset);

    const key = args.next<string>();
    if (key.error) {
      return new Result(args.offset);
    }

    const value = args.next<string>();
    if (value.error) {
      return new Result(args.offset);
    }

    this.key = key.unwrap();
    this.value = value.unwrap();

    return new Result(args.offset);
  }
}
