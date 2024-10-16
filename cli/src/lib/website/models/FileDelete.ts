import { Args, DeserializedResult, Serializable } from '@massalabs/massa-web3'

export class FileDelete implements Serializable<FileDelete> {
  constructor(public hashLocation: Uint8Array = new Uint8Array(0)) {}

  serialize(): Uint8Array {
    return new Args().addUint8Array(this.hashLocation).serialize()
  }

  deserialize(
    data: Uint8Array,
    offset: number
  ): DeserializedResult<FileDelete> {
    const args = new Args(data, offset)

    this.hashLocation = args.nextUint8Array()

    return { instance: this, offset: args.getOffset() }
  }
}
