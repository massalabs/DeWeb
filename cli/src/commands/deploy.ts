import { Command } from '@commander-js/extra-typings'

export const deployCommand = new Command('deploy')
  .alias('d')
  .description('Deploys the given website on Massa blockchain')
  .argument('<website_zip_file_path>', 'Path to the website zip file')
  .action((websiteZipFilePath, _, command) => {
    const globalOptions = command.parent?.opts()

    if (!globalOptions) {
      throw new Error(
        'Global options are not defined. This should never happen.'
      )
    }

    // Placeholder for the deploy action
    console.log(
      `Deploying ${websiteZipFilePath} with config ${globalOptions.config} and node URL ${globalOptions.node_url}`
    )
  })
