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
import { getOwnerFromWebsiteSC, getSCAddress } from './utils'

/**
 * Get the owner of a website using its 'OWNER' storage key
 * @param provider - The provider instance
 * @param address - The address of the website
 */
export async function updateWebsite(
  provider: Provider,
  address: string
): Promise<Operation> {
  const args = new Args().addString(address)

  const scAddress = getSCAddress((await provider.networkInfos()).chainId)
  const sc = new SmartContract(provider, scAddress)

  const estimatedCost = await estimateCost(sc, address)
  console.log('estimatedCost:', estimatedCost)

  return sc.call(updateWebsiteFunctionName, args, {
    coins: estimatedCost,
  })
}

/**
 * Estimate the cost in coins to update a website.
 * @param sc - The smart contract instance
 */
async function estimateCost(
  sc: SmartContract,
  address: string
): Promise<Mas.Mas> {
  return getWebsiteOwner(sc.provider, address)
    .then(async (registeredOwner) => {
      const scOwner = await getOwnerFromWebsiteSC(sc, address)
      console.log('scOwner:', scOwner)
      console.log('registeredOwner:', registeredOwner)

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

      console.log('No owner found, creating new entry: ', totalCost)

      return totalCost
    })
}
