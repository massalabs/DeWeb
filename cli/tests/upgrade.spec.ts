import { PublicProvider, StorageCost, strToBytes } from '@massalabs/massa-web3'

import { DEWEB_SC_BYTECODE } from '../src/lib/website/sc/deweb-sc-bytecode'
import { upgradeCost } from '../src/lib/website/upgrade'
import { getWebsiteVersion } from '../src/lib/website/version'

const providerStoring = (version: Uint8Array | null) =>
  ({
    readStorage: jest.fn(async () => [version]),
  }) as unknown as PublicProvider

describe('getWebsiteVersion', () => {
  it('should read the version stored by the contract', async () => {
    const provider = providerStoring(strToBytes('2'))
    expect(await getWebsiteVersion(provider, 'AS1')).toBe(2)
  })

  it('should return undefined when the website stores no version', async () => {
    expect(await getWebsiteVersion(providerStoring(null), 'AS1')).toBe(
      undefined
    )
    expect(
      await getWebsiteVersion(providerStoring(new Uint8Array()), 'AS1')
    ).toBe(undefined)
  })
})

describe('upgradeCost', () => {
  it('should pay the storage of the bytecode growth', () => {
    expect(upgradeCost(DEWEB_SC_BYTECODE.length - 500)).toBe(
      StorageCost.bytes(500)
    )
  })

  it('should send no coins when the bytecode does not grow', () => {
    expect(upgradeCost(DEWEB_SC_BYTECODE.length)).toBe(0n)
    expect(upgradeCost(DEWEB_SC_BYTECODE.length + 500)).toBe(0n)
  })
})
