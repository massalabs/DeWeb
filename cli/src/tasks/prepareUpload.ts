import { ListrEnquirerPromptAdapter } from '@listr2/prompt-adapter-enquirer'
import { formatMas, OperationStatus, U64 } from '@massalabs/massa-web3'
import { ListrTask } from 'listr2'

import {
  batchSize,
  filesInitCost,
  sendFilesInits,
} from '../lib/website/filesInit'
import { Metadata } from '../lib/website/models/Metadata'

import { UploadCtx } from './tasks'

/**
 * Create a task to upload batches
 * @returns a Listr task to upload batches
 */
export function prepareUploadTask(): ListrTask {
  return {
    title: 'Prepare upload',
    task: (ctx: UploadCtx, task) => {
      if (ctx.fileInits.length === 0 && ctx.filesToDelete.length === 0) {
        task.skip('All files are ready for upload')
        return
      }

      const utcNowDate = U64.fromNumber(Math.floor(Date.now() / 1000))

      ctx.metadatas.push(new Metadata('LAST_UPDATE', utcNowDate.toString()))

      return task.newListr(
        [
          {
            title: 'Confirm SC preparation',
            task: async (ctx, subTask) => {
              const totalChanges =
                ctx.fileInits.length +
                ctx.filesToDelete.length +
                ctx.metadatas.length +
                ctx.metadatasToDelete.length
              const estimatedOperations = Math.ceil(totalChanges / batchSize)
              const minimalFees = ctx.minimalFees * BigInt(estimatedOperations)
              const cost =
                (await filesInitCost(
                  ctx.sc,
                  ctx.fileInits,
                  ctx.filesToDelete,
                  ctx.metadatas,
                  ctx.metadatasToDelete
                )) + minimalFees
              subTask.output = `SC preparation costs ${formatMas(cost)} MAS (including ${formatMas(minimalFees)} MAS of minimal fees)`

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
            task: async (ctx: UploadCtx, subTask) => {
              if (ctx.sc === undefined) {
                throw new Error('Smart contract not found')
              }

              const operations = await sendFilesInits(
                ctx.sc,
                ctx.fileInits,
                ctx.filesToDelete,
                ctx.metadatas,
                ctx.metadatasToDelete,
                ctx.minimalFees
              )

              const results = await Promise.all(
                operations.map(async (op) => {
                  const status = await op.waitFinalExecution()
                  if (status !== OperationStatus.Success) {
                    const events = await op.getFinalEvents()
                    return {
                      status,
                      events,
                    }
                  }
                  return {
                    status,
                  }
                })
              )

              for (const result of results) {
                if (result.status !== OperationStatus.Success) {
                  subTask.output = 'Error while preparing SC for upload'
                  for (const event of result.events) {
                    subTask.output = event.data
                  }
                }
              }

              if (
                results.some(
                  (result) => result.status !== OperationStatus.Success
                )
              ) {
                throw new Error('Error while preparing SC for upload')
              }

              subTask.output = 'SC prepared for upload'
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
