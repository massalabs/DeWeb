import { Mas } from '@massalabs/massa-web3'

const STORAGE_BYTE_COST = Mas.fromString('0.0001')
const NEW_LEDGER_ENTRY_COST = STORAGE_BYTE_COST * 4n

/**
 * Compute the storage cost for a given key and value size based on the documentation at:
 * https://docs.massa.net/docs/learn/storage-costs
 * @param keySize - the size of the key to store
 * @param valueSize - the size of the value to store
 * @returns the storage cost for the given key and value size
 */
export function storageCostForEntry(
  keySize: bigint,
  valueSize: bigint
): bigint {
  return (keySize + valueSize + NEW_LEDGER_ENTRY_COST) * STORAGE_BYTE_COST
}
