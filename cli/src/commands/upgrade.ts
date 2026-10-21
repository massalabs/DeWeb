import { Command } from '@commander-js/extra-typings'
import { bytesToStr, Mas, strToBytes } from '@massalabs/massa-web3'

import {
  makeProviderFromNodeURLAndSecret,
  exitIfImmutable,
  validateWebsiteAddress,
} from './utils'
import { promptYesNo } from '../tasks/utils'
import { loadConfig } from './config'
import { commandOptions } from './options'
import {
  DEWEB_SC_BYTECODE,
  DEWEB_SC_VERSION,
} from '../lib/website/sc/deweb-sc-bytecode'
import {
  getWebsitesUpgradeInfo,
  upgradeCost,
  upgradeWebsite,
  UpgradeStatus,
} from '../lib/website/upgrade'
import { getWebsiteVersion } from '../lib/website/version'

/* Upgrade the contract of a website to the one shipped with this CLI */
export const upgradeCommand = new Command('upgrade')
  .description(
    'Upgrade the smart contract of a website to the one shipped with this CLI'
  )
  .argument('<address>', 'Address of the smart contract of the website')
  .option('-y, --yes', 'Skip confirmation prompt')
  .action(async (address, options, command) => {
    const globalOptions = loadConfig(commandOptions(command))

    validateWebsiteAddress(address)

    const provider = await makeProviderFromNodeURLAndSecret(globalOptions)

    await exitIfImmutable(
      address,
      provider,
      `The website at address ${address} is immutable. It cannot be upgraded.`
    )

    const [owner] = await provider.readStorage(
      address,
      [strToBytes('OWNER')],
      true
    )
    if (!owner || bytesToStr(owner) !== provider.address) {
      console.error(
        `Only the owner of the website can upgrade it. Owner: ${owner ? bytesToStr(owner) : 'unknown'}, your account: ${provider.address}`
      )
      process.exit(1)
    }

    const [{ status, bytecodeLength }] = await getWebsitesUpgradeInfo(
      provider,
      [address]
    )
    const version = await getWebsiteVersion(provider, address)
    switch (status) {
      case UpgradeStatus.UP_TO_DATE:
        console.log(
          `The website at address ${address} already runs the contract of this CLI (version ${DEWEB_SC_VERSION}).`
        )
        return
      case UpgradeStatus.AWAITING_MIP:
        console.error(
          `The contract of this CLI (version ${DEWEB_SC_VERSION}) needs MIP-0002, which is not active on this network yet.`
        )
        process.exit(1)
        break
      case UpgradeStatus.IMMUTABLE:
        console.error(`The website at address ${address} is immutable.`)
        process.exit(1)
    }

    const coins = upgradeCost(bytecodeLength)
    if (
      !options.yes &&
      !(await promptYesNo(
        `\nUpgrade the contract of the website at address ${address} from version ${version ?? 'unknown'} to ${DEWEB_SC_VERSION}?\n` +
          `Bytecode: ${bytecodeLength} -> ${DEWEB_SC_BYTECODE.length} bytes. ` +
          `Cost: ${Mas.toString(coins)} MAS + fees. The website files, metadata and MNS domains are kept.`
      ))
    ) {
      console.error('upgrade command aborted by user')
      process.exit(0)
    }

    console.log(`Upgrading the website at address ${address}...`)
    try {
      const operation = await upgradeWebsite(
        provider,
        address,
        bytecodeLength,
        true // Wait final execution because it's a critical operation
      )
      console.log(
        `Operation ${operation.id} finalized. The website at address ${address} now runs contract version ${await getWebsiteVersion(provider, address)}.`
      )
    } catch (err) {
      throw new Error(`Failed to upgrade the website: ${err}`)
    }
  })
