import { Command } from '@commander-js/extra-typings'

import { listFiles } from '../lib/website/read'

import { initPublicProvider } from './utils'
import {
  extractWebsiteMetadata,
  fileHashHex,
  getFileMetadata,
  getGlobalMetadata,
} from '../lib/website/metadata'
import { loadConfig } from './config'

export const listFilesCommand = new Command('list')
  .alias('ls')
  .description(
    'Lists files and metadatas from the given website on Massa blockchain'
  )
  .argument('[address]', 'Address of the website to add metadata to')
  .action(async (address, _, command) => {
    const globalOptions = loadConfig({ ...command.optsWithGlobals(), address })

    const webSiteAddress = globalOptions.address
    if (!webSiteAddress) {
      throw new Error('No address provided')
    }

    const provider = await initPublicProvider(globalOptions)

    const metadatas = await getGlobalMetadata(provider, webSiteAddress)
    const webSiteDefaultMetadata = extractWebsiteMetadata(metadatas)

    console.log('Targeting website at address', webSiteAddress)
    console.log('\nMetadatas:')
    console.log(`\tTitle: ${webSiteDefaultMetadata.title}`)
    console.log(`\tDescription: ${webSiteDefaultMetadata.description}`)
    console.log(`\tKeywords: ${webSiteDefaultMetadata.keywords?.join(', ')}`)
    console.log(
      `\tLast Update: ${new Date(Number(webSiteDefaultMetadata.lastUpdate) * 1000).toLocaleString()}`
    )
    if (Object.entries(webSiteDefaultMetadata.custom || {}).length) {
      console.log('\tCustom metadatas:')
      Object.entries(webSiteDefaultMetadata.custom || {}).forEach(
        ([key, value]) => {
          console.log(`\t\t${key}: ${value}`)
        }
      )
    }

    const filesMetadata = await getFileMetadata(provider, webSiteAddress)

    const { files, notFoundKeys } = await listFiles(provider, webSiteAddress)
    console.log(`\nTotal of ${files.length} files:`)
    files.sort().forEach((f) => {
      console.log(`\t${f}`)
      const fileMetadatas = filesMetadata[fileHashHex(f)]
      if (fileMetadatas) {
        console.log(`\t\tMetadatas:`)
        fileMetadatas.forEach((m) => {
          console.log(`\t\t - "${m.key}": "${m.value}"`)
        })
      }
    })
    if (notFoundKeys.length > 0) {
      console.error(
        'Could not retrieve the file location value of some location storage keys: ',
        notFoundKeys
      )
    }
  })
