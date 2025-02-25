import { Provider, SmartContract, StorageCost } from '@massalabs/massa-web3'
import { storageCostForEntry } from '../utils/storage'
import { DEWEB_VERSION_TAG } from './storageKeys'
import { DEWEB_SC_BYTECODE } from './sc/deweb-sc-bytecode'
const ownerKey = 'OWNER'

export async function deploySC(provider: Provider): Promise<SmartContract> {
  return SmartContract.deploy(provider, DEWEB_SC_BYTECODE, undefined, {
    coins: deployCoin(provider),
    waitFinalExecution: true,
  })
}

// deployCoin compute the cost for storing Deweb SC initialization data (owner and version) in the ledger
export function deployCoin(provider: Provider): bigint {
  const ownerKeyCost = storageCostForEntry(
    BigInt(ownerKey.length),
    BigInt(provider.address.length)
  )

  // u32 for string size, 1 byte for the version number, so 5 bytes
  const versionCost = storageCostForEntry(
    BigInt(DEWEB_VERSION_TAG.length),
    BigInt(5)
  )

  return ownerKeyCost + versionCost
}

/* deployStorageCost compute the total cost for deploying Deweb SC. */
export function deployCost(provider: Provider, minimalFees: bigint): bigint {
  return deployCoin(provider) + // cost for storing Deweb SC initialization data in the ledger
    StorageCost.smartContract(DEWEB_VERSION_TAG.length) + // Deweb SC bytecode storage cost
    minimalFees // deployment operation fees
}
