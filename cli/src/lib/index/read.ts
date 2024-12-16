import { bytesToStr, Provider } from '@massalabs/massa-web3'

import { addressToOwnerBaseKey } from './keys'
import { getSCAddress } from './utils'

/**
 * Get the owner of a website according to the index smart contract.
 * @param sc - The smart contract instance
 * @param address - The address of the website
 * @returns The owner of the website
 */
export async function getWebsiteOwner(
  provider: Provider,
  address: string
): Promise<string> {
  const scAddress = getSCAddress((await provider.networkInfos()).chainId)
  const prefix = addressToOwnerBaseKey(address)

  const keys = await provider.getStorageKeys(scAddress, prefix)
  if (keys.length === 0) {
    return ''
  }

  const ownerKey = keys[0]
  const ownerKeySliced = ownerKey.slice(prefix.length)
  return bytesToStr(ownerKeySliced)
}
