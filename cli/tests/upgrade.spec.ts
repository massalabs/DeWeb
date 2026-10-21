import { PublicProvider, StorageCost, strToBytes } from '@massalabs/massa-web3'

import { DEWEB_SC_VERSION } from '../src/lib/website/sc/deweb-sc-bytecode'
import { upgradeCoins } from '../src/lib/website/upgrade'
import {
  getWebsiteVersion,
  isUpgradeAvailable,
} from '../src/lib/website/version'

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

describe('isUpgradeAvailable', () => {
  const current = Number(DEWEB_SC_VERSION)

  it('should offer an upgrade to an older contract', () => {
    expect(isUpgradeAvailable(current - 1)).toBe(true)
  })

  it('should offer an upgrade when the version is unknown', () => {
    expect(isUpgradeAvailable(undefined)).toBe(true)
  })

  it('should not offer an upgrade to the same or a newer contract', () => {
    expect(isUpgradeAvailable(current)).toBe(false)
    expect(isUpgradeAvailable(current + 1)).toBe(false)
  })
})

describe('upgradeCoins', () => {
  it('should pay the storage of the bytecode growth', () => {
    expect(upgradeCoins(1000, 1500)).toBe(StorageCost.bytes(500))
  })

  it('should send no coins when the bytecode does not grow', () => {
    expect(upgradeCoins(1500, 1500)).toBe(0n)
    expect(upgradeCoins(1500, 1000)).toBe(0n)
  })
})
