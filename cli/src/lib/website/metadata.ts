import {
  Args,
  Operation,
  Provider,
  PublicProvider,
} from '@massalabs/massa-web3'
import { storageCostForEntry } from '../utils/storage'
import { Metadata } from './models/Metadata'
import { globalMetadataKey, GLOBAL_METADATA_TAG } from './storageKeys'

const SET_GLOBAL_METADATA_FUNCTION = 'setMetadataGlobal'

export const TITLE_METADATA_KEY = 'TITLE'
export const DESCRIPTION_METADATA_KEY = 'DESCRIPTION'
export const KEYWORD_METADATA_KEY_PREFIX = 'KEYWORD'
export const LAST_UPDATE_KEY = 'LAST_UPDATE'

/**
 * Get the global metadata of a website stored on Massa blockchain
 * @param provider - Provider instance
 * @param address - Address of the website
 * @param prefix - Prefix of the metadata
 * @returns - List of Metadata objects
 */
export async function getGlobalMetadata(
  provider: PublicProvider,
  address: string,
  prefix: Uint8Array = new Uint8Array()
): Promise<Metadata[]> {
  const metadataKeys = await provider.getStorageKeys(
    address,
    globalMetadataKey(prefix)
  )
  const metadata = await provider.readStorage(address, metadataKeys)

  return metadata.map((m, index) => {
    const metadataKeyBytes = metadataKeys[index].slice(
      GLOBAL_METADATA_TAG.length
    )
    const key = String.fromCharCode(...new Uint8Array(metadataKeyBytes))
    if (!m) {
      return new Metadata(key);
    }
    const value = String.fromCharCode(...new Uint8Array(m))

    return new Metadata(key, value)
  })
}

/**
 * Returns the title, description and keywords of a website stored on Massa blockchain
 * Keywords are sorted alphabetically (keyword1, keyword2, keyword3, ...)
 * @param provider - Provider instance
 * @param address - Address of the website
 * @returns - An object with the title, description and keywords
 */
export async function getWebsiteMetadata(
  provider: PublicProvider,
  address: string
): Promise<{
  title: string
  description: string
  keywords: string[]
}> {
  const metadata = await getGlobalMetadata(provider, address)

  const title = metadata.find((m) => m.key === TITLE_METADATA_KEY)?.value
  const description = metadata.find(
    (m) => m.key === DESCRIPTION_METADATA_KEY
  )?.value
  const keywords = metadata
    .filter((m) => m.key.startsWith(KEYWORD_METADATA_KEY_PREFIX))
    .sort()
    .map((m) => m.value)

  return { title: title ?? '', description: description ?? '', keywords }
}

/**
 * Set a list of global metadata on a website stored on Massa blockchain
 * @param provider - Provider instance
 * @param address - Address of the website SC
 * @param metadatas - List of Metadata objects
 */
export async function setGlobalMetadata(
  provider: Provider,
  address: string,
  metadatas: Metadata[]
): Promise<Operation> {
  const { updateRequired } = await divideMetadata(provider, address, metadatas)

  const encoder = new TextEncoder()
  const coins = updateRequired.reduce(
    (sum, metadata) =>
      sum +
      storageCostForEntry(
        BigInt(globalMetadataKey(encoder.encode(metadata.key)).length),
        BigInt(metadata.value.length)
      ),
    0n
  )

  const args = new Args().addSerializableObjectArray(metadatas).serialize()

  return provider.callSC({
    target: address,
    func: SET_GLOBAL_METADATA_FUNCTION,
    parameter: args,
    coins: coins,
  })
}

/**
 * Divide a list of metadatas into metadatas that require to be updated or not
 * @param provider - Provider instance
 * @param address - Address of the website SC
 * @param metadatas - List of Metadata objects
 * @returns - An object with the metadatas that require to be updated and the ones that don't
 */
export async function divideMetadata(
  provider: PublicProvider,
  address: string,
  metadatas: Metadata[]
): Promise<{ updateRequired: Metadata[]; noUpdateRequired: Metadata[] }> {
  const storedGlobalMetadata = await getGlobalMetadata(provider, address)
  const updateRequired = metadatas.filter(
    (metadata) =>
      !storedGlobalMetadata.some(
        (storedMetadata) =>
          storedMetadata.key === metadata.key &&
          storedMetadata.value === metadata.value
      )
  )
  const noUpdateRequired = metadatas.filter((metadata) =>
    storedGlobalMetadata.some(
      (storedMetadata) =>
        storedMetadata.key === metadata.key &&
        storedMetadata.value === metadata.value
    )
  )

  return { updateRequired, noUpdateRequired }
}
