import { ListrEnquirerPromptAdapter } from '@listr2/prompt-adapter-enquirer'
import { ListrTask } from 'listr2'

import { BatchStatus, UploadManager } from '../lib/uploadManager'

import { UploadCtx } from './tasks'

/**
 * Create a task to confirm the upload
 * @returns a Listr task to confirm the upload
 */
export function confirmUploadTask(): ListrTask {
  return {
    title: 'Confirm upload',
    skip: (ctx: UploadCtx) => ctx.skipConfirm || ctx.batches.length === 0,
    task: async (_, task) => {
      const answer = await task
        .prompt(ListrEnquirerPromptAdapter)
        .run<boolean>({
          type: 'Toggle',
          message: 'Do you want to proceed with the upload?',
        })

      if (answer === false) {
        throw new Error('Aborted')
      }
    },
  }
}

/**
 * Create a task to upload batches
 * @returns a Listr task to upload batches
 */
export function uploadBatchesTask(): ListrTask {
  return {
    title: 'Uploading batches',
    skip: (ctx: UploadCtx) => ctx.batches.length === 0,
    task: async (ctx: UploadCtx, task) => {
      if (!ctx.sc) {
        throw new Error('Smart Contract should never be undefined here')
      }

      const uploadManager = new UploadManager(ctx.batches, {
        maxConcurrentOps: ctx.maxConcurrentOps,
      })

      await uploadManager.startUpload(ctx.sc, () => {
        const batches = uploadManager.getBatches()
        const sentBatches = batches.filter(
          (batch) => batch.status === BatchStatus.Sent
        )
        const errorBatches = batches.filter(
          (batch) => batch.status === BatchStatus.Error
        )
        const successBatches = batches.filter(
          (batch) => batch.status === BatchStatus.Success
        )
        const waitingBatches = batches.filter(
          (batch) => batch.status === BatchStatus.WaitingUpload
        )

        task.output = ''

        sentBatches.forEach((batch) => {
          task.output += `Batch ${batch.id}: chunks sent to the node.\n`
        })
        errorBatches.forEach((batch) => {
          task.output += `Batch ${batch.id}: failed to upload. Check the logs for more information.\n`
        })

        task.title = `Uploading: ${waitingBatches.length} waiting, ${sentBatches.length} sent, ${successBatches.length} completed, ${errorBatches.length} failed`
      })

      const batches = uploadManager.getBatches()
      const errorBatches = batches.filter(
        (batch) => batch.status === BatchStatus.Error
      )
      const successBatches = batches.filter(
        (batch) => batch.status === BatchStatus.Success
      )
      const waitingBatches = batches.filter(
        (batch) => batch.status === BatchStatus.WaitingUpload
      )

      task.title = `Upload Recap: ${successBatches.length} completed, ${errorBatches.length} failed, ${waitingBatches.length} waiting`

      if (errorBatches.length > 0) {
        errorBatches.forEach((batch) => {
          batch.operation?.getFinalEvents().then((events) => {
            events.forEach((event) => {
              console.error(event.data)
            })
          })
        })
        throw new Error(
          `Failed batches: ${errorBatches.map((batch) => batch.id).join(', ')}`
        )
      }
    },
  }
}
