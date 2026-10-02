import { CommandUnknownOpts, Option } from '@commander-js/extra-typings'
import { OptionValues } from 'commander'

import { DEFAULT_CONFIG_FILE } from './config'

/**
 * Options accepted by every command.
 *
 * The program uses positional options: an option written after a subcommand name belongs to that
 * subcommand. That lets subcommands reuse short flags such as `-a` (`upload -a <address>`) without the
 * program's `-a` (`--accept_disclaimer`) swallowing them. To keep the shared options usable after the
 * subcommand name too (`deweb-cli upload -c config.json dist`), each subcommand declares them again.
 */
function sharedOptions(): Option[] {
  return [
    new Option('-c, --config <path>', 'Path to the config file'),
    new Option('-n, --node_url <url>', 'Node URL'),
    new Option('-w, --wallet <path>', 'Path to the wallet file'),
    new Option('-p, --password <password>', 'Password for the wallet file'),
  ]
}

/**
 * Declares the shared options on the program, with their defaults, and the short `-a` flag for the
 * disclaimer.
 */
export function addProgramOptions<T extends CommandUnknownOpts>(program: T): T {
  const options = sharedOptions()
  options[0].default(DEFAULT_CONFIG_FILE)
  options.forEach((option) => program.addOption(option))
  program.addOption(
    new Option('-a, --accept_disclaimer', 'Accept the legal disclaimer')
  )
  return program.enablePositionalOptions()
}

/**
 * Declares the shared options on a subcommand, without defaults so that a value given before the
 * subcommand name is not overridden. The disclaimer flag only has its long form here: `-a` is left to
 * the subcommand.
 * Extra arguments are rejected, so a misplaced value fails instead of being silently ignored.
 */
export function addSharedOptions<T extends CommandUnknownOpts>(command: T): T {
  sharedOptions().forEach((option) => command.addOption(option))
  command.addOption(
    new Option('--accept_disclaimer', 'Accept the legal disclaimer')
  )
  return command.allowExcessArguments(false)
}

/**
 * Returns the option values of a subcommand merged with the program ones.
 * Values given to the subcommand take precedence. Commander's `optsWithGlobals` does the opposite:
 * the program values, its defaults included, override the subcommand ones.
 */
export function commandOptions(command: CommandUnknownOpts): OptionValues {
  const merged: OptionValues = {}
  for (const cmd of [command.parent, command]) {
    if (!cmd) continue
    for (const [key, value] of Object.entries(cmd.opts())) {
      if (value !== undefined) merged[key] = value
    }
  }
  return merged
}
