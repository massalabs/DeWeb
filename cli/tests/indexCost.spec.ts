import {
  CHAIN_ID,
  SmartContract,
  StorageCost,
  strToBytes,
} from '@massalabs/massa-web3'

import { estimateIndexerCost } from '../src/lib/index/index'
import {
  addressToOwnerBaseKey,
  addressToOwnerKey,
  indexByOwnerKey,
} from '../src/lib/index/keys'

const WEBSITE = 'AS12BqZEQ6sByhRLyEuf0YbQmcF2PsDdkNNG1akBJu9XcjZA1eT'
const OWNER = 'AU12UBnqTHDQALpocVBnkPNy7y5CndUJQTLutaVDDFgMJcq5kQiKq'

/**
 * Index contract instance whose provider returns `ownerAndVersion` for the website OWNER and version
 * entries, and `registeredOwner` as the owner recorded in the index (undefined: not in the index).
 */
function indexSC(
  ownerAndVersion: (Uint8Array | null)[],
  registeredOwner?: string
): { sc: SmartContract; getStorageKeys: jest.Mock } {
  const getStorageKeys = jest
    .fn()
    .mockResolvedValue(
      registeredOwner === undefined
        ? []
        : [
            Uint8Array.from([
              ...addressToOwnerBaseKey(WEBSITE),
              ...strToBytes(registeredOwner),
            ]),
          ]
    )
  const provider = {
    readStorage: jest.fn().mockResolvedValue(ownerAndVersion),
    networkInfos: jest.fn().mockResolvedValue({ chainId: CHAIN_ID.Buildnet }),
    getStorageKeys,
  }
  return { sc: { provider } as unknown as SmartContract, getStorageKeys }
}

const version = strToBytes('2')

describe('estimateIndexerCost', () => {
  it('needs no coins for a purged website, which is only removed from the index', async () => {
    const { sc, getStorageKeys } = indexSC([null, null])

    expect(await estimateIndexerCost(sc, WEBSITE)).toBe(0n)
    expect(getStorageKeys).not.toHaveBeenCalled()
  })

  it('pays both index entries for a new website with an owner', async () => {
    const { sc } = indexSC([strToBytes(OWNER), version])

    expect(await estimateIndexerCost(sc, WEBSITE)).toBe(
      StorageCost.datastoreEntry(addressToOwnerKey(WEBSITE, OWNER), '') +
        StorageCost.datastoreEntry(indexByOwnerKey(OWNER, WEBSITE), '')
    )
  })

  it('pays only the address entry for a new website without owner', async () => {
    const { sc } = indexSC([null, version])

    expect(await estimateIndexerCost(sc, WEBSITE)).toBe(
      StorageCost.datastoreEntry(addressToOwnerKey(WEBSITE, ''), '')
    )
  })

  it('needs no coins when the registered owner is unchanged', async () => {
    const { sc } = indexSC([strToBytes(OWNER), version], OWNER)

    expect(await estimateIndexerCost(sc, WEBSITE)).toBe(0n)
  })
})
