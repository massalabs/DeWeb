import { Args, DeserializedResult, Serializable } from '@massalabs/massa-web3'
import { sha256 } from 'js-sha256'

export class FileDelete implements Serializable<FileDelete> {
  constructor(
    public location: string,
    public hashLocation: Uint8Array = new Uint8Array(
      sha256.arrayBuffer(location)
    )
  ) {}

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
