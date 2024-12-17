import { ListrEnquirerPromptAdapter } from '@listr2/prompt-adapter-enquirer'
import { formatMas } from '@massalabs/massa-web3'
import { ListrTask } from 'listr2'

import { updateWebsite } from '../lib/index'
import { deployCost, deploySC } from '../lib/website/deploySC'

import { UploadCtx } from './tasks'

/**
 * Create a task to deploy the SC with the prompt shown within the task
 * @returns a Listr task to deploy the SC
 */
export function deploySCTask(): ListrTask {
  return {
    title: 'Deploying SC',
    enabled: (ctx: UploadCtx) => !ctx.sc,
    task: (ctx: UploadCtx, task) => {
      const provider = ctx.provider

      return task.newListr(
        [
          {
            title: 'Prompt for SC deployment confirmation',
            task: async (ctx, subTask) => {
              subTask.output =
                'Smart contract is not deployed yet, it is required to continue.'
              subTask.output =
                `Deploying the DeWeb smart contract costs ${formatMas(deployCost(provider) + ctx.minimalFees)} MAS` +
                ` (including ${formatMas(ctx.minimalFees)} MAS of minimal fees)`

              if (!ctx.skipConfirm) {
                const answer = await subTask
                  .prompt(ListrEnquirerPromptAdapter)
                  .run<boolean>({
                    type: 'Toggle',
                    message: 'Do you agree to deploy the DeWeb smart contract?',
                  })

                if (answer === false) {
                  throw new Error('Aborted by user.')
                }
              }
            },
            rendererOptions: {
              outputBar: Infinity,
              persistentOutput: true,
            },
          },
          {
            title: 'Deploy the smart contract',
            task: async (ctx, subTask) => {
              ctx.sc = await deploySC(provider)
              ctx.currentTotalEstimation +=
                deployCost(provider) + ctx.minimalFees
              subTask.output = `Deployed SC at ${ctx.sc.address}`
            },
            rendererOptions: {
              outputBar: Infinity,
              persistentOutput: true,
            },
          },
          {
            title: 'Update DeWeb Index',
            task: async (ctx, subTask) => {
              if (ctx.noIndex) {
                subTask.skip('Skipping DeWeb Index update')
                return
              }

              subTask.output =
                'Updating the DeWeb Index with the new SC address'
              await updateWebsite(provider, ctx.sc.address)
            },
            rendererOptions: {
              outputBar: Infinity,
              persistentOutput: true,
            },
          },
        ],
        {
          concurrent: false,
          rendererOptions: {
            collapse: false,
            collapseSubtasks: false,
            outputBar: Infinity,
            persistentOutput: true,
          },
        }
      )
    },
    rendererOptions: {
      outputBar: Infinity,
      persistentOutput: true,
      collapseSubtasks: false,
    },
  }
}
