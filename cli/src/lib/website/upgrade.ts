import {
  Operation,
  OperationStatus,
  Provider,
  SmartContract,
  StorageCost,
} from '@massalabs/massa-web3'

import { DEWEB_SC_BYTECODE, DEWEB_SC_VERSION } from './sc/deweb-sc-bytecode'
import { getWebsiteVersion } from './version'

/**
 * Coins to send with `upgradeSC`: the storage cost of the bytecode growth, paid by the website
 * contract when it stores the new bytecode. A smaller bytecode frees storage, which costs nothing.
 * @param currentBytecodeLength - Size in bytes of the bytecode the website runs
 * @param newBytecodeLength - Size in bytes of the bytecode to install
 */
export function upgradeCoins(
  currentBytecodeLength: number,
  newBytecodeLength: number = DEWEB_SC_BYTECODE.length
): bigint {
  const growth = newBytecodeLength - currentBytecodeLength
  return growth > 0 ? StorageCost.bytes(growth) : 0n
}

async function waitSuccess(operation: Operation, name: string): Promise<void> {
  const status = await operation.waitFinalExecution()
  if (status !== OperationStatus.Success) {
    const events = await operation.getFinalEvents()
    throw new Error(
      `${name} failed (operation ${operation.id}, status ${OperationStatus[status]}): ` +
        events.map((e) => e.data).join('\n')
    )
  }
}

/**
 * Replaces the contract of a website with the bytecode shipped with this CLI, then records the new
 * version: the constructor only runs at deployment, so the new contract stores its version with
 * `syncVersion`, in a second operation.
 * @param provider - Provider of the website owner
 * @param address - Address of the website smart contract
 * @param coins - Coins sent with `upgradeSC`, see upgradeCoins
 * @returns The ids of the operations sent
 */
export async function upgradeWebsite(
  provider: Provider,
  address: string,
  coins: bigint
): Promise<string[]> {
  const sc = new SmartContract(provider, address)

  const upgrade = await sc.call('upgradeSC', DEWEB_SC_BYTECODE, { coins })
  await waitSuccess(upgrade, 'upgradeSC')
  const operations = [upgrade.id]

  if (
    (await getWebsiteVersion(provider, address)) !== Number(DEWEB_SC_VERSION)
  ) {
    const sync = await sc.call('syncVersion')
    await waitSuccess(sync, 'syncVersion')
    operations.push(sync.id)
  }

  return operations
}
