import {
  Args,
  bytesToStr,
  Mas,
  Operation,
  Provider,
  SmartContract,
  StorageCost,
  strToBytes,
} from '@massalabs/massa-web3'

import { DEWEB_VERSION_TAG } from '../website/storageKeys'

import { updateWebsiteFunctionName } from './const'
import { addressToOwnerKey, indexByOwnerKey } from './keys'
import { getWebsiteOwner } from './read'
import { getIndexSCAddress } from './utils'

/**
 * Update the index smart contract with the given address of a website.
 * @param provider - The provider instance
 * @param address - The address of the website
 */
export async function updateIndexScWebsite(
  provider: Provider,
  address: string
): Promise<Operation> {
  const args = new Args().addString(address)

  const scAddress = getIndexSCAddress((await provider.networkInfos()).chainId)
  const sc = new SmartContract(provider, scAddress)

  const estimatedCost = await estimateIndexerCost(sc, address)

  return sc.call(updateWebsiteFunctionName, args, {
    coins: estimatedCost > 0n ? estimatedCost : 0n,
  })
}

/**
 * Estimate the cost in coins to update a website.
 *
 * The index registers a website under its owner, read from the website contract. A website without a
 * version entry (a purged website) is only removed from the index, which frees storage: no coins are
 * needed. A website without an owner is registered with an empty owner.
 * @param sc - The index smart contract instance
 * @param address - The address of the website
 */
export async function estimateIndexerCost(
  sc: SmartContract,
  address: string
): Promise<Mas.Mas> {
  const [ownerBytes, version] = await sc.provider.readStorage(
    address,
    [strToBytes('OWNER'), DEWEB_VERSION_TAG],
    false
  )

  if (!version) {
    return 0n
  }

  const owner = ownerBytes ? bytesToStr(ownerBytes) : ''

  let registeredOwner: string
  try {
    registeredOwner = await getWebsiteOwner(sc.provider, address)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_) {
    // The website does not exist in the index, we have to create it
    const addressToOwnerKeyCost = StorageCost.datastoreEntry(
      addressToOwnerKey(address, owner),
      ''
    )
    // The owner enumeration entry is only created for a non-empty owner
    const indexByOwnerKeyCost = owner
      ? StorageCost.datastoreEntry(indexByOwnerKey(owner, address), '')
      : 0n

    return addressToOwnerKeyCost + indexByOwnerKeyCost
  }

  // can be negative !!
  return StorageCost.bytes(owner.length - registeredOwner.length)
}
