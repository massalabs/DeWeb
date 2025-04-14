import { Command } from '@commander-js/extra-typings'
import { makeProviderFromNodeURLAndSecret } from './utils'
import {
  fileHashHex,
  filterMetadataToUpdate,
  getFileMetadata,
  getGlobalMetadata,
  hasMetadataKey,
  removeFileMetadata,
  removeGlobalMetadata,
  setFileMetadata,
  setGlobalMetadata,
} from '../lib/website/metadata'
import { Metadata } from '../lib/website/models/Metadata'
import { listFiles } from '../lib/website/read'
import { loadConfig } from './config'

export const metadataCommand = new Command('metadata')
  .alias('m')
  .description('Adds metadata to an existing website on Massa blockchain')
  .argument('[address]', 'Address of the website to add metadata to')
  .option(
    '-f, --file <file_path>',
    'Add/Delete metadata only to the specified file'
  )
  .option(
    '-d, --delete <metadata_key>',
    'Delete metadata with the specified keys. If several keys are provided, separate them with a comma. ex: -d "key1,key2"'
  )
  .option(
    '-a, --add <metadata_key,metadata_value>',
    `Add metadata with the specified keys and values.
     If several entries are provided, separate them with a semicolon. ex: -a "key1,value1;key2,value2"
     For global metadata this option is only used if no metadata is provided in the config file.
     For file metadata this option is mandatory.`
  )
  .action(async (address, options, command) => {
    const globalOptions = loadConfig({ ...command.optsWithGlobals(), address })

    const webSiteAddress = globalOptions.address
    if (!webSiteAddress) {
      throw new Error('No address provided')
    }

    const provider = await makeProviderFromNodeURLAndSecret(globalOptions)

    let metadatas: Metadata[] = []
    if (options.delete) {
      metadatas = options.delete
        .split(',')
        .map((key) => new Metadata(key, '__TO_DELETE__'))
    } else {
      if (options.file) {
        if (!options.add) {
          throw new Error('You must provide metadata to add to the file')
        }
        metadatas = parseAddOption(options.add)
      } else {
        metadatas = globalOptions.metadatas ?? []

        if (options.add) {
          metadatas = [...metadatas, ...parseAddOption(options.add)]
        }
      }
    }

    if (!metadatas || !metadatas.length) {
      throw new Error('No metadata provided in config file or in options')
    }

    let operation
    if (options.file) {
      const { files } = await listFiles(provider, webSiteAddress)

      if (!files.includes(options.file)) {
        throw new Error(`File ${options.file} does not exist on the website`)
      }

      const currentFilesMetadatas = await getFileMetadata(
        provider,
        webSiteAddress,
        options.file
      )

      const currentFileMetadatas =
        currentFilesMetadatas[fileHashHex(options.file)]

      const updateRequired = await filterMetadataToUpdate(
        currentFileMetadatas,
        metadatas
      )

      // Add/delete metadata to a specific file
      if (options.delete) {
        metadatas.forEach((m) => {
          if (
            currentFileMetadatas &&
            !hasMetadataKey(currentFileMetadatas, m.key)
          ) {
            throw new Error(
              `Metadata key ${m.key} does not exist on the file metadata`
            )
          }
        })
        console.log(`Deleting metadata(s) from ${options.file}:`)
        updateRequired.map((m) => console.log(` - ${m.key}`))

        operation = await removeFileMetadata(
          provider,
          webSiteAddress,
          options.file,
          updateRequired.map((m) => m.key)
        )
      } else {
        if (!updateRequired.length) {
          console.log('Nothing to do')
          return
        }
        console.log(`Adding metadata(s) to the file ${options.file}:`)
        updateRequired.map((m) => console.log(` - ${m.key}: ${m.value}`))
        operation = await setFileMetadata(
          provider,
          webSiteAddress,
          options.file,
          updateRequired
        )
      }
    } else {
      const currentGlobalMetadata = await getGlobalMetadata(
        provider,
        webSiteAddress
      )

      const updateRequired = await filterMetadataToUpdate(
        currentGlobalMetadata,
        metadatas
      )

      // Add/delete global metadata to the website
      if (options.delete) {
        metadatas.forEach((m) => {
          if (!hasMetadataKey(currentGlobalMetadata, m.key)) {
            throw new Error(
              `Metadata key ${m.key} does not exist on the website`
            )
          }
        })

        console.log('Deleting global metadata(s) from the website:')
        updateRequired.map((m) => console.log(` - ${m.key}`))
        operation = await removeGlobalMetadata(
          provider,
          webSiteAddress,
          updateRequired.map((m) => m.key)
        )
      } else {
        if (!updateRequired.length) {
          console.log('Nothing to do')
          return
        }
        console.log('Adding global metadata(s) to the website:')
        updateRequired.map((m) => console.log(` - ${m.key}: ${m.value}`))
        operation = await setGlobalMetadata(
          provider,
          webSiteAddress,
          updateRequired
        )
      }
    }
    console.log(
      `\nWaiting for the operation to be finalized. id: ${operation!.id}`
    )
    await operation!.waitSpeculativeExecution()
    console.log(`Operation finalized.`)
  })

function parseAddOption(addOption: string): Metadata[] {
  return addOption.split(';').map((entry) => {
    const [key, value] = entry.split(',')
    return new Metadata(key, value)
  })
}
