import {
  Args,
  Mas,
  Operation,
  Provider,
  SmartContract,
  StorageCost,
} from '@massalabs/massa-web3'

import { updateWebsiteFunctionName } from './const'
import { addressToOwnerKey, indexByOwnerKey } from './keys'
import { getWebsiteOwner } from './read'
import { getOwnerFromWebsiteSC, getIndexSCAddress } from './utils'

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
 * @param sc - The smart contract instance
 */
export async function estimateIndexerCost(
  sc: SmartContract,
  address: string
): Promise<Mas.Mas> {
  try {
    const registeredOwner = await getWebsiteOwner(sc.provider, address)
    const scOwner = await getOwnerFromWebsiteSC(sc, address)

    // can be negative !!
    return StorageCost.bytes(scOwner.length - registeredOwner.length)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_) {
    // The website does not exist in the index, we have to create it
    const owner = await getOwnerFromWebsiteSC(sc, address)

    const addressToOwnerKeyCost = StorageCost.datastoreEntry(
      addressToOwnerKey(address, owner),
      ''
    )
    const indexByOwnerKeyCost = StorageCost.datastoreEntry(
      indexByOwnerKey(owner, address),
      ''
    )

    return addressToOwnerKeyCost + indexByOwnerKeyCost
  }
}
