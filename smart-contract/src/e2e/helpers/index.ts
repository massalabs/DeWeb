/* eslint-disable no-console */
import { SmartContract, Args, ArrayTypes } from '@massalabs/massa-web3';
import { ChunkPost, ChunkGet } from './serializable/Chunk';
import { sha256 } from 'js-sha256';

export async function uploadChunks(
  contract: SmartContract,
  chunks: ChunkPost[],
) {
  const op = await contract.call(
    'storeFileChunks',
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
  filePath: string,
): Promise<void> {
  const list = await getFilePathList(contract);
  if (!list.includes(filePath))
    throw new Error(`File not found in list: ${filePath}`);

  console.log(`File found in list: ${filePath}`);
}

export async function assertChunkExists(
  contract: SmartContract,
  chunk: ChunkPost,
): Promise<void> {
  const chunkGet = new ChunkGet(
    new Uint8Array(sha256.arrayBuffer(chunk.filePath)),
    chunk.id,
  );

  const result = await contract.read(
    'getChunk',
    new Args().addSerializable(chunkGet).serialize(),
  );

  if (result.value.length !== chunk.data.length)
    throw new Error('Invalid chunk');

  console.log(`Chunk found: ${chunk.filePath} ${chunk.id}`);
}
