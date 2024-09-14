import { ChunkPost } from './chunkPost'

/**
 * Divide the chunks into batches that are smaller than chunk_size.
 * Always tries to fill the batches as much as possible using the First-Fit Decreasing algorithm.
 * @param chunks - the chunks to divide into batches
 * @param chunkSize - the maximum size of each batch
 */
export function batcher(chunks: ChunkPost[], chunkSize: number): ChunkPost[][] {
  chunks.sort((a, b) => b.data.length - a.data.length)

  const batches: ChunkPost[][] = []

  for (const chunk of chunks) {
    let placed = false

    for (const batch of batches) {
      const currentBatchSize = batch.reduce((sum, c) => sum + c.data.length, 0)
      if (currentBatchSize + chunk.data.length <= chunkSize) {
        batch.push(chunk)
        placed = true
        break
      }
    }

    if (!placed) {
      batches.push([chunk])
    }
  }

  return batches
}
