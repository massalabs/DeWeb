import { Args, SmartContract } from '@massalabs/massa-web3'
import { ChunkPost } from './chunkPost'

export async function uploadChunks(
  sc: SmartContract,
  chunks: ChunkPost[]
): Promise<void> {
  const args = new Args().addSerializableObjectArray(chunks)

  sc.call('storeFileChunks', args)
    .then((result) => {
      console.log(result)
    })
    .catch((error) => {
      console.error(error)
    })
}
