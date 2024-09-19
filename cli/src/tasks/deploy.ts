import { ListrEnquirerPromptAdapter } from '@listr2/prompt-adapter-enquirer'
import { formatMas } from '@massalabs/massa-web3'
import { ListrTask } from 'listr2'

import { deployCost, deploySC } from '../lib/website/deploySC'

import { UploadCtx } from './tasks'

/**
 * Create a task to prepare chunks from the website zip file
 * @returns a Listr task to deploy the SC
 */
export function deploySCTask(): ListrTask {
  return {
    title: 'Deploying SC',
    enabled: (ctx: UploadCtx) => !ctx.sc,
    task: async (ctx: UploadCtx, task) => {
      const provider = ctx.provider

      task.output = 'Smart contract is not deployed yet'
      task.output =
        `Deploying the DeWeb smart contract costs ${formatMas(deployCost(provider) + ctx.minimalFees)}` +
        ` nMAS (including ${formatMas(ctx.minimalFees)} nMAS of minimal fees)`

      if (!ctx.skipConfirm) {
        const answer = await task
          .prompt(ListrEnquirerPromptAdapter)
          .run<boolean>({
            type: 'Toggle',
            message: 'Do you agree to deploy the DeWeb smart contract?',
          })

        if (answer === false) {
          throw new Error('Aborted')
        }
      }

      ctx.sc = await deploySC(provider)
      ctx.currentTotalEstimation += deployCost(provider) + ctx.minimalFees
      task.output = `Deployed SC at ${ctx.sc.address}`
    },
    rendererOptions: {
      outputBar: Infinity,
      persistentOutput: true,
    },
  }
}
