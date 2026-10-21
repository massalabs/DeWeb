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
import { DEWEB_SC_VERSION } from '../lib/website/sc/deweb-sc-bytecode'
import { upgradeCoins, upgradeWebsite } from '../lib/website/upgrade'
import { getWebsiteVersion, isUpgradeAvailable } from '../lib/website/version'

/* Upgrade the contract of a website to the version shipped with this CLI */
export const upgradeCommand = new Command('upgrade')
  .description(
    'Upgrade the smart contract of a website to the version shipped with this CLI'
  )
  .argument('<address>', 'Address of the smart contract of the website')
  .option('-y, --yes', 'Skip confirmation prompt')
  .option('--force', 'Upgrade even if the website already runs this version')
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

    const version = await getWebsiteVersion(provider, address)
    if (!isUpgradeAvailable(version) && !options.force) {
      console.log(
        `The website at address ${address} already runs contract version ${version}, the version of this CLI.`
      )
      return
    }

    const currentBytecode = await provider.client.getAddressesBytecode({
      address,
      is_final: true,
    })
    const coins = upgradeCoins(currentBytecode.length)

    if (
      !options.yes &&
      !(await promptYesNo(
        `\nUpgrade the contract of the website at address ${address} from version ${version ?? 'unknown'} to ${DEWEB_SC_VERSION}?\n` +
          `It sends ${Mas.toString(coins)} MAS for the bytecode storage, plus the operation fees. The website files are kept.`
      ))
    ) {
      console.error('upgrade command aborted by user')
      process.exit(0)
    }

    console.log(`Upgrading the website at address ${address}...`)
    try {
      const operations = await upgradeWebsite(provider, address, coins)
      console.log(
        `Operations finalized: ${operations.join(', ')}.\n` +
          `The website at address ${address} now runs contract version ${await getWebsiteVersion(provider, address)}.`
      )
    } catch (err) {
      throw new Error(`Failed to upgrade the website: ${err}`)
    }
  })
