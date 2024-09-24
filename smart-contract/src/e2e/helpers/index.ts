/* eslint-disable no-console */
import {
  SmartContract,
  Args,
  ArrayTypes,
  strToBytes,
} from '@massalabs/massa-web3';
import {
  ChunkPost,
  ChunkGet,
  PreStore,
  ChunkDelete,
} from './serializable/Chunk';

import assert from 'assert';

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

export async function deleteFile(contract: SmartContract, filePath: string) {
  const deleteChunk = new ChunkDelete(
    filePath,
    new Uint8Array(sha256.arrayBuffer(filePath)),
  );
  const op = await contract.call(
    'deleteFile',
    new Args().addSerializableObjectArray([deleteChunk]).serialize(),
  );

  await op.waitSpeculativeExecution();
}

export async function deleteFiles(
  contract: SmartContract,
  filePathArray: string[],
) {
  const deleteArray: ChunkDelete[] = [];

  for (const filePath of filePathArray) {
    deleteArray.push(
      new ChunkDelete(filePath, new Uint8Array(sha256.arrayBuffer(filePath))),
    );
  }

  const op = await contract.call(
    'deleteFiles',
    new Args().addSerializableObjectArray(deleteArray).serialize(),
  );

  await op.waitSpeculativeExecution();
}

export async function getFilePathList(
  contract: SmartContract,
): Promise<string[]> {
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

export async function assertFileIsDeleted(
  contract: SmartContract,
  filePath: string,
) {
  // assert that the file is deleted from the list
  const list = await getFilePathList(contract);
  for (let file of list) {
    if (file === filePath) {
      throw new Error(`File still exists in list: ${filePath}`);
    }

    //IMPROVE: assert that the file is deleted from the chunks
  }

  console.log(`File successfully deleted ${filePath} from list`);
}

export async function assertListIsEmpty(contract: SmartContract) {
  const list = await getFilePathList(contract);

  if (list.length !== 0) {
    throw new Error('List is not empty');
  }

  console.log('All files have been deleted');
}
