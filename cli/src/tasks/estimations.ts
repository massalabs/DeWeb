import { formatMas, StorageCost } from '@massalabs/massa-web3'
import { ListrTask } from 'listr2'

import { newWebsiteIndexCost } from '../lib/index/index'
import { costOrRefund, formatAbsMas, formatBytes } from '../lib/utils/utils'
import { computeChunkCost } from '../lib/website/chunk'
import { buildDeleteCalls } from '../lib/website/delete'
import { deployCost, deployRequiredBalance } from '../lib/website/deploySC'
import {
  filesInitCoins,
  getFileInitBatchLen,
  prepareCost,
} from '../lib/website/filesInit'
import { globalMetadataStorageDelta } from '../lib/website/metadata'
import { getWebsiteStorage } from '../lib/website/read'

import { CostEstimation, DeleteCtx, DeleteEstimation, UploadCtx } from './tasks'

function maxBigInt(a: bigint, b: bigint): bigint {
  return a > b ? a : b
}

/**
 * Estimate the cost of an upload.
 *
 * Every DeWeb SC call refunds the coins it did not use, so the net cost is the
 * change in storage plus the operation fees. The SC preparation sends coins for
 * the storage it allocates and refunds the storage it frees (replaced files,
 * deleted files, smaller metadata) once executed, before the chunks upload.
 * @param ctx - the upload context, with the batches and changes prepared
 * @returns the cost estimation
 */
export async function estimateUploadCost(
  ctx: UploadCtx
): Promise<CostEstimation> {
  const chunks = ctx.batches.reduce(
    (sum, batch) =>
      sum +
      batch.chunks.reduce(
        (sum, chunk) =>
          sum + computeChunkCost(chunk.location, chunk.index, chunk.data),
        0n
      ),
    0n
  )

  const { filePathListCost, storageCost } = await prepareCost(
    ctx.fileInits,
    [],
    [],
    []
  )
  const filesInit = filePathListCost + storageCost
  const metadatas = globalMetadataStorageDelta(
    ctx.onChainMetadatas,
    ctx.metadatas,
    ctx.metadatasToDelete
  )
  const freed = ctx.freedStorageCost
  const preparationCoins = await filesInitCoins(
    ctx.fileInits,
    ctx.filesToDelete,
    ctx.metadatas,
    ctx.metadatasToDelete
  )

  const preparationFees =
    ctx.minimalFees *
    BigInt(
      getFileInitBatchLen(
        ctx.fileInits,
        ctx.filesToDelete,
        ctx.metadatas,
        ctx.metadatasToDelete
      )
    )
  const uploadFees = ctx.minimalFees * BigInt(ctx.batches.length)

  let deployment = 0n
  let deploymentBalance = 0n
  let index = 0n
  let indexFees = 0n
  if (!ctx.sc) {
    // includes the deployment operation fees
    deployment = deployCost(ctx.provider, ctx.minimalFees)
    deploymentBalance = deployRequiredBalance(ctx.provider, ctx.minimalFees)

    if (!ctx.noIndex) {
      // The website address is not known before deployment: the deployer
      // address has the same length and stands in for it.
      index = newWebsiteIndexCost(ctx.provider.address, ctx.provider.address)
      indexFees = ctx.minimalFees
    }
  }

  const preparation = filesInit + metadatas - freed
  const fees = indexFees + preparationFees + uploadFees

  return {
    deployment,
    index,
    filesInit,
    metadatas,
    freed,
    chunks,
    preparationCoins,
    fees,
    total: deployment + index + preparation + chunks + fees,
    requiredBalance:
      deploymentBalance +
      index +
      indexFees +
      // The preparation operations are sent before their refunds are received,
      // the chunks upload is sent once the preparation is executed.
      maxBigInt(
        preparationCoins + preparationFees,
        preparation + preparationFees + chunks + uploadFees
      ),
  }
}

/**
 * Estimate the cost of deleting a website, and of purging it if requested.
 *
 * Deleting frees storage, which the SC refunds to its owner: the net cost is
 * the operation fees minus the freed storage, usually a refund. A purge also
 * frees the remaining entries (owner, version) and the bytecode, but not the
 * SC account itself. The DeWeb Index refunds nothing: the storage it frees
 * stays in the index SC balance.
 * @param ctx - the delete context, with the files and metadata to delete
 * @returns the cost estimation
 */
export async function estimateDeleteCost(
  ctx: DeleteCtx
): Promise<DeleteEstimation> {
  const storage = await getWebsiteStorage(ctx.provider, ctx.sc.address)
  const [{ balance: scBalance }] = await ctx.provider.balanceOf(
    [ctx.sc.address],
    true
  )

  let operationCount = buildDeleteCalls(
    ctx.sc,
    ctx.fileDeletes,
    ctx.globalMetadatas
  ).length

  let purge = 0n
  if (ctx.purge) {
    purge = storage.other + StorageCost.bytes(ctx.scBytecodeSize)
    operationCount += ctx.noIndex ? 1 : 2
  }

  const files = ctx.fileDeletes.length ? storage.files : 0n
  const metadatas = ctx.globalMetadatas.length ? storage.metadatas : 0n
  const fees = ctx.minimalFees * BigInt(operationCount)
  // The SC sends its whole balance back with the first call
  const refundedBalance = operationCount ? scBalance : 0n

  return {
    files,
    metadatas,
    purge,
    scBalance: refundedBalance,
    fees,
    total: fees - files - metadatas - purge - refundedBalance,
  }
}

/**
 * Create a task to estimate the total cost of the upload: SC deployment and
 * index registration (new website only), SC preparation and chunk upload.
 * Fails if the balance cannot cover it.
 * @returns a Listr task
 */
export function showEstimatedCost(): ListrTask {
  return {
    title: 'Estimated upload cost',
    task: async (ctx: UploadCtx, task) => {
      const estimation = await estimateUploadCost(ctx)
      ctx.estimation = estimation

      if (ctx.batches.length) {
        const totalBytes = ctx.batches.reduce(
          (sum, batch) =>
            sum + batch.chunks.reduce((sum, c) => sum + c.data.length, 0),
          0
        )
        task.output = `${ctx.batches.length} batches found for a total of ${formatBytes(totalBytes)}`
      }
      if (!ctx.sc) {
        task.output = `  + SC deployment: ${formatMas(estimation.deployment)} MAS`
        if (!ctx.noIndex) {
          task.output = `  + DeWeb Index registration: ${formatMas(estimation.index)} MAS`
        }
      }
      task.output = `  + Files init: ${formatMas(estimation.filesInit)} MAS`
      task.output = `  ${estimation.metadatas < 0n ? '-' : '+'} Metadatas: ${formatAbsMas(estimation.metadatas)} MAS`
      if (estimation.freed > 0n) {
        task.output = `  - Freed by replaced and deleted files: ${formatMas(estimation.freed)} MAS`
      }
      task.output = `  + Chunks storage: ${formatMas(estimation.chunks)} MAS`
      task.output = `  + Operation fees: ${formatMas(estimation.fees)} MAS`
      task.output = `Total estimated ${costOrRefund(estimation.total)}: ${formatAbsMas(estimation.total)} MAS`
      if (estimation.requiredBalance > estimation.total) {
        task.output = `Required balance: ${formatMas(estimation.requiredBalance)} MAS (the excess is refunded)`
      }

      const finalBalance = await ctx.provider.balance(true)
      if (finalBalance < estimation.requiredBalance) {
        throw new Error(
          `Current balance ${formatMas(finalBalance)} MAS is too low, ${formatMas(estimation.requiredBalance)} MAS are required`
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

      if (ctx.estimation) {
        task.output = `Total estimated ${costOrRefund(ctx.estimation.total)}: ${formatAbsMas(ctx.estimation.total)} MAS`
      }
      task.output = `Website deployed at ${ctx.sc?.address}`
    },
    rendererOptions: {
      outputBar: Infinity,
      persistentOutput: true,
    },
  }
}
