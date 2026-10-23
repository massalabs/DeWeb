import { Provider, SmartContract, StorageCost } from '@massalabs/massa-web3'
import { DEWEB_VERSION_TAG } from './storageKeys'
import { DEWEB_SC_BYTECODE, DEWEB_SC_VERSION } from './sc/deweb-sc-bytecode'
const ownerKey = 'OWNER'

// Coins are sent for a version of up to 5 bytes. The excess stays in the SC
// balance and is refunded to the owner by the next call.
const DEWEB_VERSION_MAX_SIZE = 5

export async function deploySC(provider: Provider): Promise<SmartContract> {
  return SmartContract.deploy(provider, DEWEB_SC_BYTECODE, undefined, {
    coins: deployCoin(provider),
    waitFinalExecution: true,
  })
}

// deployCoin compute the coins sent for storing Deweb SC initialization data (owner and version) in the ledger
export function deployCoin(provider: Provider): bigint {
  const ownerKeyCost = StorageCost.datastoreEntry(ownerKey, provider.address)

  const versionCost = StorageCost.datastoreEntry(
    DEWEB_VERSION_TAG,
    'b'.repeat(DEWEB_VERSION_MAX_SIZE)
  )

  return ownerKeyCost + versionCost
}

/* deployCost compute the net cost of deploying the Deweb SC. */
export function deployCost(provider: Provider, minimalFees: bigint): bigint {
  return (
    StorageCost.datastoreEntry(ownerKey, provider.address) + // owner entry
    StorageCost.datastoreEntry(DEWEB_VERSION_TAG, DEWEB_SC_VERSION) + // version entry stored by the SC constructor
    StorageCost.smartContractDeploy(DEWEB_SC_BYTECODE.length) + // Deweb SC bytecode storage cost
    minimalFees
  ) // deployment operation fees
}

/* deployRequiredBalance compute the balance needed to send the deployment operation. */
export function deployRequiredBalance(
  provider: Provider,
  minimalFees: bigint
): bigint {
  return (
    deployCoin(provider) +
    StorageCost.smartContractDeploy(DEWEB_SC_BYTECODE.length) +
    minimalFees
  )
}
