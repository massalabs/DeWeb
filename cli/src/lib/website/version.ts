import { bytesToStr, PublicProvider } from '@massalabs/massa-web3'

import { DEWEB_VERSION_TAG } from './storageKeys'
import { DEWEB_SC_VERSION } from './sc/deweb-sc-bytecode'
import { getWebsitesUpgradeInfo, UpgradeStatus } from './upgrade'

/**
 * Reads the version of the contract of a website, as its constructor (or `syncVersion`) stored it.
 * @param provider - Provider instance
 * @param address - Address of the website smart contract
 * @returns The version, or undefined if the website stores none
 */
export async function getWebsiteVersion(
  provider: PublicProvider,
  address: string
): Promise<number | undefined> {
  const [version] = await provider.readStorage(
    address,
    [DEWEB_VERSION_TAG],
    true
  )
  if (!version?.length) return undefined
  const parsed = Number(bytesToStr(version))
  return Number.isInteger(parsed) ? parsed : undefined
}

/**
 * Prints a warning when the website runs another contract than the one shipped with this CLI.
 * Immutable and up-to-date websites print nothing.
 * @param provider - Provider instance
 * @param address - Address of the website smart contract
 */
export async function warnIfUpgradeAvailable(
  provider: PublicProvider,
  address: string
): Promise<void> {
  try {
    const [{ status }] = await getWebsitesUpgradeInfo(provider, [address])
    if (
      status !== UpgradeStatus.AVAILABLE &&
      status !== UpgradeStatus.AWAITING_MIP
    ) {
      return
    }

    const version = await getWebsiteVersion(provider, address)
    const versions = `The website at address ${address} runs contract version ${version ?? 'unknown'}, this CLI ships version ${DEWEB_SC_VERSION}.`
    console.warn(
      status === UpgradeStatus.AVAILABLE
        ? `\n${versions}\nUpgrade it with: deweb-cli upgrade ${address}\n`
        : `\n${versions}\nIt can be upgraded once MIP-0002 is active on this network.\n`
    )
  } catch (error) {
    // The check is informative only: never block the command on it
    console.warn(`Could not check the contract of ${address}: ${error}`)
  }
}
