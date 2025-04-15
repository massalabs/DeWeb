import { formatMas } from '@massalabs/massa-web3'
import { ListrTask } from 'listr2'

import { formatBytes } from '../lib/utils/utils'
import { computeChunkCost } from '../lib/website/chunk'

import { UploadCtx } from './tasks'
import { deployCost } from '../lib/website/deploySC'

/**
 * Create a task to estimate the cost of each batch
 * @returns a Listr task
 */
export function showEstimatedCost(): ListrTask {
  return {
    title: 'Estimated upload cost',
    skip: (ctx: UploadCtx) => ctx.batches.length === 0,
    task: async (ctx: UploadCtx, task) => {
      let totalBytes = 0

      const chunkStorageCosts = ctx.batches.reduce((sum, batch) => {
        const cost = batch.chunks.reduce((sum, chunk) => {
          totalBytes += chunk.data.length
          return sum + computeChunkCost(chunk.location, chunk.index, chunk.data)
        }, 0n)
        return sum + cost
      }, 0n)

      const opFees = ctx.minimalFees * BigInt(ctx.batches.length)

      ctx.currentTotalEstimation += opFees
      ctx.currentTotalEstimation += chunkStorageCosts
      if (!ctx.sc) {
        ctx.currentTotalEstimation += deployCost(ctx.provider, ctx.minimalFees)
      }

      task.output = `${ctx.batches.length} batches found for a total of ${formatBytes(totalBytes)}`
      task.output = `Total estimated cost: ${formatMas(ctx.currentTotalEstimation)} MAS (with ${formatMas(opFees)} MAS of operation fees)`

      const finalBalance = await ctx.provider.balance(true)
      if (finalBalance < ctx.currentTotalEstimation) {
        throw new Error(
          `Current balance ${finalBalance.toString()} too low to cover the operation fees`
        )
      }
    },
    rendererOptions: {
      outputBar: Infinity,
      persistentOutput: true,
    },
  }
}

/**
 * Create a task that shows the total estimated cost
 * Note: Needs to be modified to show the real total cost
 * @returns a Listr task
 */
export function recapTask(): ListrTask {
  return {
    title: 'Recap',
    task: (ctx: UploadCtx, task) => {
      if (ctx.batches.length === 0) {
        task.output = 'No file was modified'
      }

      task.output = `Total estimated cost: ${formatMas(ctx.currentTotalEstimation)} MAS`
      task.output = `Website deployed at ${ctx.sc?.address}`
    },
    rendererOptions: {
      outputBar: Infinity,
      persistentOutput: true,
    },
  }
}
