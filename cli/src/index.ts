#!/usr/bin/env node

import { Command } from '@commander-js/extra-typings'

import { deleteCommand } from './commands/delete'
import { listFilesCommand } from './commands/list'
import { showFileCommand } from './commands/showFile'
import { uploadCommand } from './commands/upload'
import { metadataCommand } from './commands/metadata'
import { immutableCommand } from './commands/immutable'
import { addProgramOptions, addSharedOptions } from './commands/options'

import { handleDisclaimer } from './tasks/disclaimer'

const version = process.env.VERSION || 'dev'

const program = new Command()

program
  .name('deweb-cli')
  .description('CLI app for deploying websites')
  .version(version)
addProgramOptions(program)

for (const command of [
  uploadCommand,
  deleteCommand,
  listFilesCommand,
  showFileCommand,
  metadataCommand,
  immutableCommand,
]) {
  program.addCommand(addSharedOptions(command))
}

async function disclaimer(accepted = false) {
  if (!accepted && program.getOptionValue('accept_disclaimer') === undefined) {
    try {
      await handleDisclaimer()
    } catch (error) {
      console.error('Failed terms of uses validation, got : ' + error)
      process.exit(1)
    }
  }
}

// execute before each command
program.hook('preAction', async (_, actionCommand) => {
  await disclaimer(actionCommand.getOptionValue('accept_disclaimer') === true)
})

// execute when the cli is run without any command
program.action(async () => {
  await disclaimer()
  program.help()
})

program.parse()
