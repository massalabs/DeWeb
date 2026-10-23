import { ListrEnquirerPromptAdapter } from '@listr2/prompt-adapter-enquirer'
import { formatMas, OperationStatus } from '@massalabs/massa-web3'
import { ListrTask } from 'listr2'

import { getFileInitBatchLen, sendFilesInits } from '../lib/website/filesInit'

import { costOrRefund, formatAbsMas } from '../lib/utils/utils'

import { estimateUploadCost } from './estimations'
import { CostEstimation, UploadCtx } from './tasks'

/**
 * Create a task to upload batches
 * @returns a Listr task to upload batches
 */
export function prepareUploadTask(): ListrTask {
  return {
    title: 'Prepare upload',
    task: (ctx: UploadCtx, task) => {
      if (
        ctx.fileInits.length === 0 &&
        ctx.filesToDelete.length === 0 &&
        ctx.metadatas.length === 0 &&
        ctx.metadatasToDelete.length === 0
      ) {
        task.skip('No changes in files and metadata to upload')
        return
      }

      return task.newListr(
        [
          {
            title: 'Confirm SC preparation',
            task: async (ctx, subTask) => {
              if (
                ctx.fileInits.length !== 0 ||
                ctx.filesToDelete.length !== 0
              ) {
                subTask.output = 'Files changes detected'
              }
              if (
                ctx.metadatas.length !== 0 ||
                ctx.metadatasToDelete.length !== 0
              ) {
                subTask.output = 'Metadata changes detected'
              }

              const operationCount = getFileInitBatchLen(
                ctx.fileInits,
                ctx.filesToDelete,
                ctx.metadatas,
                ctx.metadatasToDelete
              )
              const minimalFees = ctx.minimalFees * BigInt(operationCount)

              const estimation: CostEstimation =
                ctx.estimation ?? (await estimateUploadCost(ctx))
              const { filesInit, metadatas, freed, preparationCoins } =
                estimation
              const netCost = filesInit + metadatas - freed

              subTask.output = `Estimated SC preparation:`
              subTask.output = `  + Files init: ${formatMas(filesInit)} MAS`
              subTask.output = `  ${metadatas < 0n ? '-' : '+'} Metadatas: ${formatAbsMas(metadatas)} MAS`
              subTask.output = `  - Freed by replaced and deleted files: ${formatMas(freed)} MAS`
              const preparationTotal = netCost + minimalFees
              const feesNote = preparationTotal < 0n ? 'after' : 'including'
              subTask.output = `SC preparation ${costOrRefund(preparationTotal)}: ${formatAbsMas(preparationTotal)} MAS (${feesNote} ${formatMas(minimalFees)} MAS of minimal fees)`
              if (preparationCoins > netCost) {
                subTask.output = `${formatMas(preparationCoins)} MAS are sent with the operations, the excess is refunded`
              }

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
                ctx.metadatasToDelete
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
