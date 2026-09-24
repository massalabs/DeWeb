import { SmartContract } from '@massalabs/massa-web3'

import { buildDeleteCalls, deleteBatchSize } from '../src/lib/website/delete'
import { FileDelete } from '../src/lib/website/models/FileDelete'
import { Metadata } from '../src/lib/website/models/Metadata'

const sc = {} as SmartContract

describe('buildDeleteCalls', () => {
  it('should return no call when there is nothing to delete', () => {
    expect(buildDeleteCalls(sc, [], [])).toHaveLength(0)
  })

  it('should spread files over several filesInit operations', () => {
    const fileDeletes = Array.from(
      { length: deleteBatchSize * 2 + 1 },
      (_, i) => new FileDelete(`file${i}`)
    )

    const calls = buildDeleteCalls(sc, fileDeletes, [])

    expect(calls).toHaveLength(3)
    expect(calls.every((c) => c.functionName === 'filesInit')).toBe(true)
    expect(calls.every((c) => c.options?.coins === 0n)).toBe(true)
  })

  it('should spread global metadata over several removeMetadataGlobal operations', () => {
    const globalMetadatas = Array.from(
      { length: deleteBatchSize + 1 },
      (_, i) => new Metadata(`key${i}`, `value${i}`)
    )

    const calls = buildDeleteCalls(sc, [], globalMetadatas)

    expect(calls).toHaveLength(2)
    expect(calls.every((c) => c.functionName === 'removeMetadataGlobal')).toBe(
      true
    )
  })

  it('should not batch when everything fits in a single operation', () => {
    const fileDeletes = Array.from(
      { length: deleteBatchSize },
      (_, i) => new FileDelete(`file${i}`)
    )
    const globalMetadatas = [new Metadata('key', 'value')]

    const calls = buildDeleteCalls(sc, fileDeletes, globalMetadatas)

    expect(calls).toHaveLength(2)
    expect(calls[0].functionName).toBe('filesInit')
    expect(calls[1].functionName).toBe('removeMetadataGlobal')
  })
})
