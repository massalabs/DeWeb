import {
  Args,
  Mas,
  Operation,
  Provider,
  SmartContract,
} from '@massalabs/massa-web3'

import { storageCostForEntry } from '../utils/storage'
import { updateWebsiteFunctionName } from './const'
import { addressToOwnerBaseKey, indexByOwnerBaseKey } from './keys'
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
    coins: estimatedCost,
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
  return getWebsiteOwner(sc.provider, address)
    .then(async (registeredOwner) => {
      const scOwner = await getOwnerFromWebsiteSC(sc, address)

      return storageCostForEntry(
        BigInt(Math.abs(scOwner.length - registeredOwner.length)),
        0n
      )
    })
    .catch(async () => {
      // The website does not exist in the index, we have to create it
      const owner = await getOwnerFromWebsiteSC(sc, address)
      const addressToOwnerPrefix = addressToOwnerBaseKey(address)
      const indexByOwnerPrefix = indexByOwnerBaseKey(owner)

      const addressToOwnerKeyCost = storageCostForEntry(
        BigInt(addressToOwnerPrefix.length) + BigInt(owner.length),
        0n
      )
      const indexByOwnerKeyCost = storageCostForEntry(
        BigInt(indexByOwnerPrefix.length) + BigInt(address.length),
        0n
      )

      const totalCost = addressToOwnerKeyCost + indexByOwnerKeyCost

      return totalCost
    })
}
