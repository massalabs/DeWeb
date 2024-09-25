import { formatMas } from '@massalabs/massa-web3'
import { ListrTask } from 'listr2'

import { BatchStatus, UploadBatch } from '../lib/uploadManager'
import { computeChunkCost } from '../lib/website/chunk'
import { estimateBatchGas } from '../lib/website/uploadChunk'

import { UploadCtx } from './tasks'
import { formatBytes } from './utils'

/**
 * Create a task to estimate the cost of each batch
 * @returns a Listr task
 */
export function showEstimatedCost(): ListrTask {
  return {
    title: 'Estimated upload cost',
    skip: (ctx: UploadCtx) => ctx.batches.length === 0,
    task: async (ctx: UploadCtx, task) => {
      const totalEstimatedGas = ctx.batches.reduce((sum, batch) => {
        const cost = batch.chunks.reduce((sum, chunk) => {
          return (
            sum +
            computeChunkCost(
              chunk.filePath,
              chunk.chunkId,
              BigInt(chunk.data.length)
            )
          )
        }, 0n)
        return sum + cost
      }, 0n)

      const totalBytes = ctx.batches.reduce(
        (sum, batch) =>
          sum + batch.chunks.reduce((sum, chunk) => sum + chunk.data.length, 0),
        0
      )

      const opFees = ctx.minimalFees * BigInt(ctx.batches.length)

      task.output = `${ctx.batches.length} batches found for a total of ${formatBytes(totalBytes)}`
      task.output = `Total estimated cost: ${formatMas(totalEstimatedGas + opFees)} MAS (with ${formatMas(opFees)} MAS of operation fees)`

      const finalBalance = await ctx.provider.balance(true)
      if (finalBalance < opFees) {
        throw new Error(
          'Final balance is not enough to cover the operation fees'
        )
      }

      ctx.currentTotalEstimation += opFees
    },
    rendererOptions: {
      outputBar: Infinity,
      persistentOutput: true,
    },
  }
}

/**
 * Create a task to prepare chunks from the website dir path
 * @returns a Listr task to prepare chunks
 */
export function estimateGasTask(): ListrTask {
  return {
    title: 'Estimating gas cost for each batch',
    skip: (ctx: UploadCtx) => ctx.batches.length === 0,
    task: async (ctx, task) => {
      const uploadBatches: UploadBatch[] = await Promise.all(
        ctx.batches
          .sort(
            (a: UploadBatch, b: UploadBatch) =>
              b.chunks.length - a.chunks.length
          )
          .map(async (batch: UploadBatch, index: number) => ({
            ...batch,
            id: index,
            status: BatchStatus.WaitingUpload,
            gas: await estimateBatchGas(ctx.sc, batch),
          }))
      )
      ctx.uploadBatches = uploadBatches

      const totalGas = uploadBatches.reduce(
        (sum: bigint, batch: UploadBatch) => sum + batch.gas,
        0n
      )
      task.output = `Total gas cost: ${formatMas(totalGas)} MAS`
      ctx.currentTotalEstimation += totalGas
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
