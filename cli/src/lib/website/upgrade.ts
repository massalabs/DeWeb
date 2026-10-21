import {
  batchListAndCall,
  DEFAULT_MAX_ARGUMENT_ARRAY_SIZE,
  Multicall,
  Operation,
  OperationStatus,
  Provider,
  PublicAPI,
  PublicProvider,
  StorageCost,
} from '@massalabs/massa-web3'

import { DEWEB_VERSION_TAG } from './storageKeys'
import { DEWEB_SC_BYTECODE, DEWEB_SC_VERSION } from './sc/deweb-sc-bytecode'

/**
 * Import of the paginated datastore-keys ABI. A contract importing it can only run once MIP-0002
 * (execution version 2) is active: before that, the node fails to instantiate it.
 */
const MIP_0002_IMPORT = 'assembly_script_get_keys_paginated'
const MIP_0002_VERSION = 2

/**
 * Function of recent contracts that stores their version. upgradeSC runs the code being replaced,
 * which cannot know the new version: the new code writes it, in the same operation.
 */
const SYNC_VERSION_FUNCTION = 'syncVersion'

export enum UpgradeStatus {
  // The website runs the contract bundled in this CLI.
  UP_TO_DATE,
  // The website runs another contract and can be upgraded.
  AVAILABLE,
  // The bundled contract needs a MIP the network has not activated yet.
  AWAITING_MIP,
  // The website has no bytecode anymore: it cannot be upgraded.
  IMMUTABLE,
}

export interface WebsiteUpgradeInfo {
  status: UpgradeStatus
  // Length of the bytecode the website currently runs.
  bytecodeLength: number
}

interface BundledContractInfo {
  // MIP version the bundled contract needs to run.
  requiredMipVersion: number
  // Whether the bundled contract can store its version after an upgrade.
  hasSyncVersion: boolean
}

let bundledContractInfoPromise: Promise<BundledContractInfo> | undefined

/**
 * Reads the imports and exports of the bundled contract.
 * The bytecode is compiled asynchronously: browsers refuse a synchronous compile of this size on the
 * main thread.
 */
function bundledContractInfo(): Promise<BundledContractInfo> {
  if (!bundledContractInfoPromise) {
    bundledContractInfoPromise = WebAssembly.compile(
      // copy into an ArrayBuffer-backed array, as BufferSource requires
      new Uint8Array(DEWEB_SC_BYTECODE)
    ).then((module) => ({
      requiredMipVersion: WebAssembly.Module.imports(module).some(
        (entry) => entry.module === 'massa' && entry.name === MIP_0002_IMPORT
      )
        ? MIP_0002_VERSION
        : 0,
      hasSyncVersion: WebAssembly.Module.exports(module).some(
        (entry) => entry.name === SYNC_VERSION_FUNCTION
      ),
    }))
  }
  return bundledContractInfoPromise
}

function isBundledBytecode(bytecode: Uint8Array): boolean {
  return (
    bytecode.length === DEWEB_SC_BYTECODE.length &&
    bytecode.every((byte, i) => byte === DEWEB_SC_BYTECODE[i])
  )
}

/**
 * Tells, for each website, whether its contract can be upgraded to the one bundled in this CLI.
 * @param provider - The provider to use
 * @param addresses - The website contract addresses
 * @returns The upgrade information of each website, in the order of `addresses`
 */
export async function getWebsitesUpgradeInfo(
  provider: PublicProvider,
  addresses: string[]
): Promise<WebsiteUpgradeInfo[]> {
  if (addresses.length === 0) {
    return []
  }

  const publicAPI = await PublicAPI.fromProvider(provider)
  const [bytecodes, status, { requiredMipVersion }] = await Promise.all([
    batchListAndCall(
      addresses,
      (batch) =>
        publicAPI.executeMultipleGetAddressesBytecode(
          batch.map((address) => ({ address, is_final: false }))
        ),
      DEFAULT_MAX_ARGUMENT_ARRAY_SIZE
    ),
    publicAPI.status(),
    bundledContractInfo(),
  ])
  const mipActive = Number(status.current_mip_version) >= requiredMipVersion

  return bytecodes.map((bytecode) => {
    let upgradeStatus: UpgradeStatus
    if (bytecode.length === 0) {
      upgradeStatus = UpgradeStatus.IMMUTABLE
    } else if (isBundledBytecode(bytecode)) {
      upgradeStatus = UpgradeStatus.UP_TO_DATE
    } else if (!mipActive) {
      upgradeStatus = UpgradeStatus.AWAITING_MIP
    } else {
      upgradeStatus = UpgradeStatus.AVAILABLE
    }
    return { status: upgradeStatus, bytecodeLength: bytecode.length }
  })
}

/**
 * Coins to send with the upgrade: the storage cost of the extra bytecode bytes, if any.
 * The contract pays the bytecode storage from its balance. Recent contracts send their whole
 * balance back to the caller after the upgrade, so only what is needed is sent.
 * @param currentBytecodeLength - Length of the bytecode the website currently runs
 */
export function upgradeCost(currentBytecodeLength: number): bigint {
  return StorageCost.bytes(
    Math.max(0, DEWEB_SC_BYTECODE.length - currentBytecodeLength)
  )
}

/**
 * Replaces the website contract bytecode with the one bundled in this CLI.
 * Only the website owner can do it. The website files and metadata are kept.
 *
 * When the bundled contract has syncVersion, the upgrade and the version update are sent as one
 * operation: upgradeSC, then syncVersion, which already runs the new code. If the new code cannot
 * run, for instance before the MIP it needs is active, syncVersion fails and the whole operation is
 * reverted, bytecode included.
 * @param provider - The provider of the website owner
 * @param address - The website contract address
 * @param currentBytecodeLength - Length of the bytecode the website currently runs
 * @param waitFinal - Wait for the final execution instead of the speculative one
 * @returns The operation, once executed
 * @throws If the upgrade fails
 */
export async function upgradeWebsite(
  provider: Provider,
  address: string,
  currentBytecodeLength: number,
  waitFinal = false
): Promise<Operation> {
  const { hasSyncVersion } = await bundledContractInfo()
  const coins = upgradeCost(currentBytecodeLength)

  const operation = hasSyncVersion
    ? await new Multicall(provider).execute([
        {
          targetContract: address,
          targetFunc: 'upgradeSC',
          callData: DEWEB_SC_BYTECODE,
          coins,
        },
        {
          targetContract: address,
          targetFunc: SYNC_VERSION_FUNCTION,
          // In case the version entry is missing; the contract sends back what is left.
          coins: StorageCost.datastoreEntry(
            DEWEB_VERSION_TAG,
            DEWEB_SC_VERSION
          ),
        },
      ])
    : await provider.callSC({
        func: 'upgradeSC',
        target: address,
        parameter: DEWEB_SC_BYTECODE,
        coins,
      })

  const [status, expected] = waitFinal
    ? [await operation.waitFinalExecution(), OperationStatus.Success]
    : [
        await operation.waitSpeculativeExecution(),
        OperationStatus.SpeculativeSuccess,
      ]
  if (status !== expected) {
    const events = waitFinal
      ? await operation.getFinalEvents()
      : await operation.getSpeculativeEvents()
    const reason = events.map((event) => event.data).join('\n')
    throw new Error(
      `Upgrade operation ${operation.id} failed${reason ? `: ${reason}` : ''}`
    )
  }

  return operation
}
