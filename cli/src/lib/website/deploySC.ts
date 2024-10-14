import { Provider, SmartContract, U32 } from '@massalabs/massa-web3'
import { readFileSync } from 'fs'
import { storageCostForEntry } from '../utils/storage'
import { DEWEB_VERSION_TAG } from './storageKeys'

const byteCode = readFileSync('src/lib/website/sc/main.wasm')
const ownerKey = 'OWNER'

export async function deploySC(provider: Provider): Promise<SmartContract> {
  return SmartContract.deploy(provider, byteCode, undefined, {
    coins: deployCost(provider),
  })
}

export function deployCost(provider: Provider): bigint {
  const ownerKeyCost = storageCostForEntry(
    BigInt(ownerKey.length),
    BigInt(provider.address.length)
  )

  // u32 for string size, 1 byte for the version number, so 5 bytes
  const versionCost = storageCostForEntry(BigInt(DEWEB_VERSION_TAG.length), BigInt(5))

  return ownerKeyCost + versionCost
}
