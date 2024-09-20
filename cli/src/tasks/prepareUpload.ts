import { ListrEnquirerPromptAdapter } from '@listr2/prompt-adapter-enquirer'
import { formatMas, OperationStatus } from '@massalabs/massa-web3'
import { ListrTask } from 'listr2'

import { preStoreChunks, preStoreCost } from '../lib/website/preStore'

/**
 * Create a task to upload batches
 * @returns a Listr task to upload batches
 */
export function prepareUploadTask(): ListrTask {
  return {
    title: 'Prepare upload',
    task: (_, task) => {
      return task.newListr(
        [
          {
            title: 'Confirm SC preparation',
            task: async (ctx, subTask) => {
              const cost =
                (await preStoreCost(ctx.sc, ctx.preStores)) + ctx.minimalFees
              subTask.output = `SC preparation costs ${formatMas(cost)} MAS (including ${formatMas(ctx.minimalFees)} MAS of minimal fees)`

              if (!ctx.skipConfirm) {
                const answer = await subTask
                  .prompt(ListrEnquirerPromptAdapter)
                  .run<boolean>({
                    type: 'Toggle',
                    message: 'Do you agree to proceed?',
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
            title: 'Preparing SC for upload',
            task: async (ctx, subTask) => {
              if (ctx.sc === undefined) {
                throw new Error('Smart contract not found')
              }

              const op = await preStoreChunks(ctx.sc, ctx.preStores)
              if ((await op.waitFinalExecution()) !== OperationStatus.Success) {
                throw new Error('Failed to pre-store chunks')
              }

              subTask.output = 'Chunks pre-stored successfully'
            },
            rendererOptions: {
              outputBar: Infinity,
              persistentOutput: true,
            },
          },
        ],
        {
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
