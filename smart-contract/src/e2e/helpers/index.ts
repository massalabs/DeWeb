/* eslint-disable no-console */
import { SmartContract, Args, ArrayTypes } from '@massalabs/massa-web3';
import { ChunkPost, ChunkGet, PreStore } from './serializable/Chunk';
import { sha256 } from 'js-sha256';

export async function storeChunk(contract: SmartContract, chunks: ChunkPost[]) {
  const op = await contract.call(
    'storeFileChunks',
    new Args().addSerializableObjectArray(chunks).serialize(),
  );

  await op.waitSpeculativeExecution();
}

export async function preStoreChunks(
  contract: SmartContract,
  chunks: PreStore[],
) {
  const op = await contract.call(
    'preStoreFileChunks',
    new Args().addSerializableObjectArray(chunks).serialize(),
  );

  await op.waitSpeculativeExecution();
}

async function getFilePathList(contract: SmartContract): Promise<string[]> {
  const fileList = await contract.read(
    'getFilePathList',
    new Args().serialize(),
  );
  return new Args(fileList.value).nextArray(ArrayTypes.STRING);
}

export async function assertFilePathInList(
  contract: SmartContract,
  filePaths: string[],
): Promise<void> {
  const list = await getFilePathList(contract);
  // eslint-disable-next-line guard-for-in
  for (let filePath of filePaths) {
    if (!list.includes(filePath)) {
      throw new Error(`File not found in list: ${filePath}`);
    }
    console.log(`File found in list: ${filePath}`);
  }
}

export async function assertChunkExists(
  contract: SmartContract,
  chunk: ChunkPost,
): Promise<void> {
  const chunkGet = new ChunkGet(
    new Uint8Array(sha256.arrayBuffer(chunk.filePath)),
    chunk.index,
  );

  const result = await contract.read(
    'getChunk',
    new Args().addSerializable(chunkGet).serialize(),
  );

  if (result.value.length !== chunk.data.length)
    throw new Error('Invalid chunk');

  console.log(`Chunk found: ${chunk.filePath} ${chunk.index}`);
}
