import { ListrEnquirerPromptAdapter } from '@listr2/prompt-adapter-enquirer'
import { formatMas, OperationStatus, U64 } from '@massalabs/massa-web3'
import { ListrTask } from 'listr2'

import {
  batchSize,
  prepareCost,
  sendFilesInits,
} from '../lib/website/filesInit'
import { LAST_UPDATE_KEY } from '../lib/website/metadata'
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
      if (
        ctx.fileInits.length === 0 &&
        ctx.filesToDelete.length === 0 &&
        ctx.metadatas.length === 0 &&
        ctx.metadatasToDelete.length === 0
      ) {
        task.skip('All files are ready for upload, and no metadata changes')
        return
      }

      const utcNowDate = U64.fromNumber(Math.floor(Date.now() / 1000))

      ctx.metadatas.push(new Metadata(LAST_UPDATE_KEY, utcNowDate.toString()))

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

              const totalChanges =
                ctx.fileInits.length +
                ctx.filesToDelete.length +
                ctx.metadatas.length +
                ctx.metadatasToDelete.length
              const estimatedOperations = Math.ceil(totalChanges / batchSize)
              const minimalFees = ctx.minimalFees * BigInt(estimatedOperations)
              const {
                filePathListCost,
                storageCost,
                filesToDeleteCost,
                metadatasCost,
                metadatasToDeleteCost,
              } = await prepareCost(
                ctx.sc,
                ctx.fileInits,
                ctx.filesToDelete,
                ctx.metadatas,
                ctx.metadatasToDelete
              )

              const totalCost =
                filePathListCost +
                storageCost -
                filesToDeleteCost +
                metadatasCost -
                metadatasToDeleteCost

              subTask.output = `Estimated cost of SC preparation:`
              subTask.output = `  + Files init: ${formatMas(filePathListCost)} MAS`
              subTask.output = `  + Storage: ${formatMas(storageCost)} MAS`
              subTask.output = `  - Files to delete: ${formatMas(filesToDeleteCost)} MAS`
              subTask.output = `  + Metadatas: ${formatMas(metadatasCost)} MAS`
              subTask.output = `  - Metadatas to delete: ${formatMas(metadatasToDeleteCost)} MAS`
              subTask.output = `SC preparation costs ${formatMas(totalCost + minimalFees)} MAS (including ${formatMas(minimalFees)} MAS of minimal fees)`

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
