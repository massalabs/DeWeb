import { ListrEnquirerPromptAdapter } from '@listr2/prompt-adapter-enquirer'
import { ListrTask } from 'listr2'

import { deleteWebsite, prepareDeleteWebsite } from '../lib/website/delete'

import { DeleteCtx } from './tasks'

export function prepareDeleteWebsiteTask(): ListrTask {
  return {
    title: 'Preparing delete operation',
    task: async (ctx: DeleteCtx) => {
      const { fileDeletes, globalMetadatas } = await prepareDeleteWebsite(
        ctx.sc
      )

      ctx.fileDeletes = fileDeletes
      ctx.globalMetadatas = globalMetadatas
    },
    rendererOptions: {
      outputBar: Infinity,
      persistentOutput: true,
    },
  }
}

export function confirmDeleteWebsiteTask(): ListrTask {
  return {
    title: 'Confirm delete operation',
    task: async (ctx: DeleteCtx, task) => {
      if (ctx.fileDeletes.length === 0 && ctx.globalMetadatas.length === 0) {
        task.skip('No files or global metadatas to delete')
        return
      }

      task.output = `${ctx.fileDeletes.length} files to delete\n
          ${ctx.globalMetadatas.length} global metadatas to delete`
      if (ctx.skipConfirm) {
        task.skip('Skipping confirmation')
        return
      }
      const answer = await task
        .prompt(ListrEnquirerPromptAdapter)
        .run<boolean>({
          type: 'Toggle',
          message: 'Do you want to proceed with the delete operation?',
        })

      if (answer === false) {
        throw new Error('Aborted')
      }
    },
    rendererOptions: {
      outputBar: Infinity,
      persistentOutput: true,
    },
  }
}

export function deleteWebsiteTask(): ListrTask {
  return {
    title: 'Deleting website',
    task: async (ctx: DeleteCtx, task) => {
      if (ctx.fileDeletes.length === 0 && ctx.globalMetadatas.length === 0) {
        task.skip('No files or global metadatas to delete')
        return
      }

      deleteWebsite(ctx.sc, ctx.fileDeletes, ctx.globalMetadatas)
        .then(() => {
          task.output = 'Website deleted successfully'
        })
        .catch((error) => {
          task.output = 'Error deleting website'
          throw error
        })
    },
    rendererOptions: {
      outputBar: Infinity,
      persistentOutput: true,
    },
  }
}
