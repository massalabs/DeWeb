import { I32, strToBytes } from '@massalabs/massa-web3'

/**
 * Returns the base key for the owner's address.
 * @param address - The website address
 * @returns The base key for the owner's address
 */
export function addressToOwnerBaseKey(address: string): Uint8Array {
  const prefix = strToBytes('\x01')
  const lengthBytes = I32.toBytes(BigInt(address.length))
  const addressBytes = strToBytes(address)

  const result = new Uint8Array(
    prefix.length + lengthBytes.length + addressBytes.length
  )
  result.set(prefix, 0)
  result.set(lengthBytes, prefix.length)
  result.set(addressBytes, prefix.length + lengthBytes.length)

  return result
}

/**
 * Returns the base key for the owner's list of websites.
 * @param owner - The owner's address
 * @returns The base key for the owner's list of websites
 */
export function indexByOwnerBaseKey(owner: string): Uint8Array {
  const prefix = strToBytes('\x00')
  const lengthBytes = I32.toBytes(BigInt(owner.length))
  const ownerBytes = strToBytes(owner)

  const result = new Uint8Array(
    prefix.length + lengthBytes.length + ownerBytes.length
  )
  result.set(prefix, 0)
  result.set(lengthBytes, prefix.length)
  result.set(ownerBytes, prefix.length + lengthBytes.length)

  return result
}
