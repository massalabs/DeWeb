import { Serializable, Args, Result } from '@massalabs/as-types';

export class ChunkPost implements Serializable {
  constructor(
    public filePath: string = '',
    public chunkId: u32 = 0,
    public data: StaticArray<u8> = [],
    public totalChunks: u32 = 1,
  ) {}

  serialize(): StaticArray<u8> {
    return new Args()
      .add(this.filePath)
      .add(this.chunkId)
      .add(this.data)
      .add(this.totalChunks)
      .serialize();
  }

  deserialize(data: StaticArray<u8>, offset: i32): Result<i32> {
    const args = new Args(data, offset);

    const filePath = args.next<string>();
    if (filePath.error) {
      return new Result(args.offset);
    }

    const chunkId = args.next<u32>();
    if (chunkId.error) {
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
    this.chunkId = chunkId.unwrap();
    this.data = chunkData.unwrap();
    this.totalChunks = totalChunks.unwrap();

    return new Result(args.offset);
  }
}

export class ChunkGet implements Serializable {
  constructor(
    public filePathHash: StaticArray<u8> = [],
    public chunkId: u32 = 0,
  ) {}

  serialize(): StaticArray<u8> {
    return new Args().add(this.filePathHash).add(this.chunkId).serialize();
  }

  deserialize(data: StaticArray<u8>, offset: i32): Result<i32> {
    const args = new Args(data, offset);

    const filePathHash = args.next<StaticArray<u8>>();
    if (filePathHash.error) {
      return new Result(args.offset);
    }

    const chunkId = args.next<u32>();
    if (chunkId.error) {
      return new Result(args.offset);
    }

    this.filePathHash = filePathHash.unwrap();
    this.chunkId = chunkId.unwrap();

    return new Result(args.offset);
  }
}
