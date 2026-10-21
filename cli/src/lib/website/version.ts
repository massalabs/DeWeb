import { bytesToStr, isImmutable, PublicProvider } from '@massalabs/massa-web3'

import { DEWEB_VERSION_TAG } from './storageKeys'
import { DEWEB_SC_VERSION } from './sc/deweb-sc-bytecode'

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
 * Tells whether the bytecode shipped with this CLI is newer than the contract of a website.
 * @param websiteVersion - Version of the website contract, undefined if it stores none
 */
export function isUpgradeAvailable(
  websiteVersion: number | undefined
): boolean {
  return (websiteVersion ?? 0) < Number(DEWEB_SC_VERSION)
}

/**
 * Prints a warning when the website runs an older contract than the one shipped with this CLI.
 * Immutable websites cannot be upgraded: nothing is printed for them.
 * @param provider - Provider instance
 * @param address - Address of the website smart contract
 */
export async function warnIfUpgradeAvailable(
  provider: PublicProvider,
  address: string
): Promise<void> {
  try {
    const version = await getWebsiteVersion(provider, address)
    if (!isUpgradeAvailable(version)) return
    if (await isImmutable(address, provider, true)) return

    console.warn(
      `\nThe website at address ${address} runs contract version ${version ?? 'unknown'}, ` +
        `this CLI ships version ${DEWEB_SC_VERSION}.\n` +
        `Upgrade it with: deweb-cli upgrade ${address}\n`
    )
  } catch (error) {
    // The check is informative only: never block the command on it
    console.warn(`Could not check the contract version of ${address}: ${error}`)
  }
}
