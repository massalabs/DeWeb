import { Provider, SmartContract, U32 } from '@massalabs/massa-web3'
import { readFileSync } from 'fs'
import { storageCostForEntry } from '../utils/storage'

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
  const fileListCost = storageCostForEntry(1n, BigInt(U32.SIZE_BYTE))

  return ownerKeyCost + fileListCost
}
