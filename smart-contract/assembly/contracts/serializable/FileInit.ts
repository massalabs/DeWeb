import { Args, Result } from '@massalabs/as-types';
import { Serializable } from '@massalabs/as-types/assembly/serializable';
import { Metadata } from './Metadata';

/**
 * Represents the initialization data for a file.
 * Implements the Serializable interface for encoding and decoding.
 */
export class FileInit implements Serializable {
  /**
   * Creates a new FileInit instance.
   * @param location - The location of the file.
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

  /**
   * Serializes the FileInit instance into a byte array.
   * @returns A StaticArray<u8> representing the serialized data.
   */
  serialize(): StaticArray<u8> {
    return new Args()
      .add(this.location)
      .add(this.hashLocation)
      .add(this.totalChunk)
      .addSerializableObjectArray(this.metadata)
      .serialize();
  }

  /**
   * Deserializes a byte array into a FileInit instance.
   * @param data - The byte array to deserialize.
   * @param offset - The starting offset in the byte array.
   * @returns A Result containing the new offset after deserialization.
   */
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
