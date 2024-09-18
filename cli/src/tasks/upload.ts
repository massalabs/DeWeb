import { ListrEnquirerPromptAdapter } from '@listr2/prompt-adapter-enquirer'
import { Listr, ListrTask } from 'listr2'

import { BatchStatus, UploadManager } from '../lib/uploadManager'

import { UploadCtx } from './tasks'

/**
 * Create a task to confirm the upload
 * @returns a Listr task to confirm the upload
 */
export function confirmUploadTask(): ListrTask {
  return {
    title: 'Confirm upload',
    task: async (ctx: UploadCtx, task) => {
      if (!ctx.skipConfirm) {
        const answer = await task
          .prompt(ListrEnquirerPromptAdapter)
          .run<boolean>({
            type: 'Toggle',
            message: 'Do you want to proceed with the upload?',
          })

        if (answer === false) {
          throw new Error('Aborted')
        }
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
    task: (ctx) => {
      const uploadManager = new UploadManager(ctx.uploadBatches, {
        maxConcurrentOps: 4,
      })

      // Create subtasks for each batch upload
      const batchTasks: ListrTask[] = uploadManager
        .getBatches()
        .map((batch) => ({
          title: `Batch ${batch.id} (Status: ${BatchStatus[batch.status]})`,
          task: (_, task) =>
            new Promise<void>((resolve, reject) => {
              const interval = setInterval(() => {
                const updatedBatch = uploadManager
                  .getBatches()
                  .find((b) => b.id === batch.id)
                if (updatedBatch) {
                  task.title = `Batch ${updatedBatch.id}: ${BatchStatus[updatedBatch.status]}`

                  const baseOutput = `Batch ${updatedBatch.id} with ${updatedBatch.chunks.length} chunks:`

                  if (updatedBatch.status === BatchStatus.Sent) {
                    task.output = `${baseOutput} chunks sent to the node.`
                  } else if (updatedBatch.status === BatchStatus.Success) {
                    task.output = `${baseOutput} successfully uploaded.`
                    clearInterval(interval)
                    resolve()
                  } else if (updatedBatch.status === BatchStatus.Error) {
                    clearInterval(interval)
                    reject(
                      new Error(
                        `${baseOutput} failed to upload. Check the logs for more information.`
                      )
                    )
                    updatedBatch.operation?.getFinalEvents().then((events) => {
                      events.forEach((event) => {
                        console.error(event.data)
                      })
                    })
                  }
                }
              }, 500)
            }),
          options: { persistentOutput: true },
        }))

      uploadManager.startUpload(ctx.sc, (updatedBatch) => {
        const taskIndex = batchTasks.findIndex((task) =>
          task.title?.includes(`Batch ${updatedBatch.id}`)
        )
        if (taskIndex !== -1) {
          batchTasks[taskIndex].title =
            `Batch ${updatedBatch.id} (Status: ${BatchStatus[updatedBatch.status]})`
        }
      })

      return new Listr(batchTasks, {
        concurrent: true,
        rendererOptions: { collapse: false, collapseSubtasks: false },
      })
    },
  }
}
