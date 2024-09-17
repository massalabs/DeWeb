import { Args, SmartContract } from '@massalabs/massa-web3'
import { ChunkPost } from './chunkPost'
import { computeChunkCost } from './chunk'

export async function uploadChunks(
  sc: SmartContract,
  chunks: ChunkPost[]
): Promise<void> {
  const args = new Args().addSerializableObjectArray(chunks)
  const coins = chunks.reduce(
    (acc, chunk, index) =>
      acc +
      computeChunkCost(
        chunk.filePath,
        BigInt(index),
        BigInt(chunk.data.length)
      ),
    0n
  )

  sc.call('storeFileChunks', args, {
    coins: coins,
  })
    .then(async (result) => {
      await result.waitSpeculativeExecution()
      console.log(result)
    })
    .catch((error) => {
      console.error(error)
    })
}
