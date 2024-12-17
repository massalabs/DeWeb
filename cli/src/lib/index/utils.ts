import { bytesToStr, CHAIN_ID, SmartContract } from '@massalabs/massa-web3'

import { BUILDNET_INDEX_ADDRESS } from './const'

/**
 * Get the owner of a website using its 'OWNER' storage key
 * @param sc - The smart contract instance
 * @param address - The address of the website
 * @returns The owner of the website
 */
export async function getOwnerFromWebsiteSC(
  sc: SmartContract,
  address: string
): Promise<string> {
  const ownerAddress = await sc.provider.readStorage(address, ['OWNER'], true)
  if (ownerAddress.length === 0) {
    throw new Error(`Could not find owner for website ${address}`)
  }

  return bytesToStr(ownerAddress[0])
}

/**
 * Get the index smart contract address for a given chain id
 * @param chainId - The chain id of the network to get the index smart contract address for
 * @returns The index smart contract address
 */
export function getSCAddress(chainId: bigint): string {
  switch (chainId) {
    case CHAIN_ID.Mainnet:
      throw new Error('Mainnet is not supported yet')
    case CHAIN_ID.Buildnet:
      return BUILDNET_INDEX_ADDRESS
    default:
      throw new Error('Unsupported network')
  }
}
