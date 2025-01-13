import { bytesToStr, PublicProvider } from '@massalabs/massa-web3'

import { addressToOwnerBaseKey, indexByOwnerBaseKey } from './keys'
import { getSCAddress } from './utils'

/**
 * Get the owner of a website according to the index smart contract.
 * @param sc - The smart contract instance
 * @param address - The address of the website
 * @returns The owner of the website
 */
export async function getWebsiteOwner(
  provider: PublicProvider,
  address: string
): Promise<string> {
  const scAddress = getSCAddress((await provider.networkInfos()).chainId)
  const prefix = addressToOwnerBaseKey(address)

  const keys = await provider.getStorageKeys(scAddress, prefix)
  if (keys.length === 0) {
    throw new Error('Website not found in the index')
  }

  const ownerKey = keys[0]
  const ownerKeySliced = ownerKey.slice(prefix.length)
  return bytesToStr(ownerKeySliced)
}

/**
 * Get the website addresses owned by an address according to the index smart contract.
 * @param provider - PublicProvider instance
 * @param owner - The owner's address
 * @returns The website addresses owned by the owner
 */
export async function getAddressWebsites(
  provider: PublicProvider,
  owner: string
): Promise<string[]> {
  const scAddress = getSCAddress((await provider.networkInfos()).chainId)
  const prefix = indexByOwnerBaseKey(owner)

  const keys = await provider.getStorageKeys(scAddress, prefix)
  if (keys.length === 0) {
    return []
  }

  return keys.map((key) => {
    const keySliced = key.slice(prefix.length)
    return bytesToStr(keySliced)
  })
}
