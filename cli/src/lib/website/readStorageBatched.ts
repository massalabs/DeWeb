import { PublicProvider } from '@massalabs/massa-web3'

/** Maximum number of datastore entries the node reads in one request */
const MAX_READ_STORAGE_KEYS = 128

/**
 * Read datastore entries, in as many requests as the node limit requires
 * @param provider - Provider instance
 * @param scAddress - Address of the smart contract
 * @param keys - the keys to read
 * @returns the values, null for a missing key
 */
export async function readStorageBatched(
  provider: PublicProvider,
  scAddress: string,
  keys: Uint8Array[]
): Promise<(Uint8Array | null)[]> {
  const values: (Uint8Array | null)[] = []
  for (let i = 0; i < keys.length; i += MAX_READ_STORAGE_KEYS) {
    values.push(
      ...(await provider.readStorage(
        scAddress,
        keys.slice(i, i + MAX_READ_STORAGE_KEYS),
        false
      ))
    )
  }
  return values
}
