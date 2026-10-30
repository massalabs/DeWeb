import { PublicProvider } from '@massalabs/massa-web3'

import { readStorageBatched } from './readStorageBatched'

describe('readStorageBatched', () => {
  it('splits the keys in batches of 128 and keeps their order', async () => {
    const batchSizes: number[] = []
    const provider = {
      readStorage: async (_address: string, keys: Uint8Array[]) => {
        batchSizes.push(keys.length)
        return keys
      },
    } as unknown as PublicProvider

    const keys = Array.from({ length: 2 * 128 + 1 }, (_, i) =>
      Uint8Array.from([i >> 8, i & 0xff])
    )

    const values = await readStorageBatched(provider, 'AS_batch', keys)

    expect(batchSizes).toEqual([128, 128, 1])
    expect(values).toEqual(keys)
  })

  it('sends no request for an empty key list', async () => {
    const readStorage = jest.fn()
    const provider = { readStorage } as unknown as PublicProvider

    expect(await readStorageBatched(provider, 'AS_batch', [])).toEqual([])
    expect(readStorage).not.toHaveBeenCalled()
  })
})
