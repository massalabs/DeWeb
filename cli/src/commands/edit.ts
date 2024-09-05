import { Command } from '@commander-js/extra-typings'

export const editCommand = new Command('edit')
  .alias('e')
  .description('Edit a website')
  .arguments('<website_sc_address> <website_zip_file_path>')
  .action((websiteScAddress, websiteZipFilePath, _, command) => {
    const globalOptions = command.parent?.opts()

    if (!globalOptions) {
      throw new Error(
        'Global options are not defined. This should never happen.'
      )
    }

    // Placeholder for the edit action
    console.log(
      `Editing website ${websiteScAddress} with zip file ${websiteZipFilePath}, config ${globalOptions.config}, and node URL ${globalOptions.node_url}`
    )
  })
