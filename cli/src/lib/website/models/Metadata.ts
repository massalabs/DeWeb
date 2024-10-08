import { Args, DeserializedResult, Serializable } from '@massalabs/massa-web3'

export class Metadata implements Serializable<Metadata> {
  constructor(
    public key: Uint8Array = new Uint8Array(0),
    public value: Uint8Array = new Uint8Array(0)
  ) {}

  serialize(): Uint8Array {
    return new Args()
      .addUint8Array(this.key)
      .addUint8Array(this.value)
      .serialize()
  }

  deserialize(data: Uint8Array, offset: number): DeserializedResult<Metadata> {
    const args = new Args(data, offset)

    this.key = args.nextUint8Array()
    this.value = args.nextUint8Array()

    return { instance: this, offset: args.getOffset() }
  }
}
