import { Args, Result } from '@massalabs/as-types';
import { Serializable } from '@massalabs/as-types/assembly/serializable';

export class Metadata implements Serializable {
  constructor(
    public key: StaticArray<u8> = new StaticArray<u8>(0),
    public value: StaticArray<u8> = new StaticArray<u8>(0),
  ) {}

  serialize(): StaticArray<u8> {
    return new Args().add(this.key).add(this.value).serialize();
  }

  deserialize(data: StaticArray<u8>, offset: i32): Result<i32> {
    const args = new Args(data, offset);

    const key = args.next<StaticArray<u8>>();
    if (key.error) {
      return new Result(args.offset);
    }

    const value = args.next<StaticArray<u8>>();
    if (value.error) {
      return new Result(args.offset);
    }

    this.key = key.unwrap();
    this.value = value.unwrap();

    return new Result(args.offset);
  }
}
