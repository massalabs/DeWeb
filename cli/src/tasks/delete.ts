import { ListrEnquirerPromptAdapter } from '@listr2/prompt-adapter-enquirer'
import { formatMas, OperationStatus } from '@massalabs/massa-web3'
import { ListrTask } from 'listr2'

import {
  buildDeleteCalls,
  deleteWebsite,
  prepareDeleteWebsite,
} from '../lib/website/delete'

import { updateIndexScWebsite } from '../lib/index/index'

import { costOrRefund, formatAbsMas } from '../lib/utils/utils'

import { estimateDeleteCost } from './estimations'
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

/**
 * Create a task to estimate the cost of the deletion, usually a refund.
 * Fails if the balance cannot cover the operation fees.
 * @returns a Listr task
 */
export function showDeleteEstimationTask(): ListrTask {
  return {
    title: 'Estimated delete cost',
    task: async (ctx: DeleteCtx, task) => {
      const estimation = await estimateDeleteCost(ctx)
      ctx.estimation = estimation

      task.output = `  - Freed by deleted files: ${formatMas(estimation.files)} MAS`
      task.output = `  - Freed by deleted metadatas: ${formatMas(estimation.metadatas)} MAS`
      if (ctx.purge) {
        task.output = `  - Freed by purging the SC: ${formatMas(estimation.purge)} MAS`
      }
      if (estimation.scBalance > 0n) {
        task.output = `  - SC balance: ${formatMas(estimation.scBalance)} MAS`
      }
      task.output = `  + Operation fees: ${formatMas(estimation.fees)} MAS`
      task.output = `Total estimated ${costOrRefund(estimation.total)}: ${formatAbsMas(estimation.total)} MAS`

      const balance = await ctx.provider.balance(true)
      if (balance < estimation.fees) {
        throw new Error(
          `Current balance ${formatMas(balance)} MAS is too low, ${formatMas(estimation.fees)} MAS are required`
        )
      }
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

      const opCount = buildDeleteCalls(
        ctx.sc,
        ctx.fileDeletes,
        ctx.globalMetadatas
      ).length

      task.output =
        `${ctx.fileDeletes.length} files to delete\n` +
        `          ${ctx.globalMetadatas.length} global metadatas to delete\n` +
        `          ${opCount} operations will be sent`
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

      await deleteWebsite(
        ctx.sc,
        ctx.fileDeletes,
        ctx.globalMetadatas,
        (progress) => {
          task.output =
            `Deleting: ${progress.succeeded}/${progress.total} operations confirmed` +
            (progress.failed > 0 ? ` (${progress.failed} failed)` : '')
        }
      )
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

export function confirmPurgeWebsiteTask(): ListrTask {
  return {
    title: 'Confirm purge operation',
    task: async (ctx: DeleteCtx, task) => {
      if (!ctx.purge) {
        task.skip('No purge operation requested')
        return
      }

      task.output = 'Purge operation requested'
      if (ctx.skipConfirm) {
        task.skip('Skipping confirmation')
        return
      }
      const answer = await task
        .prompt(ListrEnquirerPromptAdapter)
        .run<boolean>({
          type: 'Toggle',
          message: 'Do you want to proceed with the purge operation?',
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

export function purgeWebsiteTask(): ListrTask {
  return {
    title: 'Purging website',
    task: async (ctx: DeleteCtx, task) => {
      task.output = 'Purging website'

      const op = await ctx.sc.call('purge')
      const status = await op.waitSpeculativeExecution()

      if (
        status !== OperationStatus.SpeculativeSuccess &&
        status !== OperationStatus.Success
      ) {
        throw new Error(
          `Failed to execute purge (status: ${status.toString()})`
        )
      }

      task.output = 'Website purged successfully'
    },
    rendererOptions: {
      outputBar: Infinity,
      persistentOutput: true,
    },
  }
}

export function updateIndexAfterPurgeTask(): ListrTask {
  return {
    title: 'Update DeWeb Index',
    task: async (ctx: DeleteCtx, task) => {
      if (ctx.noIndex) {
        task.skip('Skipping DeWeb Index update')
        return
      }

      // A purged website has no version entry anymore: the index removes it.
      task.output = 'Removing the website from the DeWeb Index'
      const op = await updateIndexScWebsite(ctx.provider, ctx.sc.address)
      const status = await op.waitSpeculativeExecution()

      if (
        status !== OperationStatus.SpeculativeSuccess &&
        status !== OperationStatus.Success
      ) {
        throw new Error(
          `Failed to update the DeWeb Index (status: ${status.toString()})`
        )
      }

      task.output = 'Website removed from the DeWeb Index'
    },
    rendererOptions: {
      outputBar: Infinity,
      persistentOutput: true,
    },
  }
}
