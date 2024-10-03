/* eslint-disable no-console */
import { SmartContract, Args, ArrayTypes } from '@massalabs/massa-web3';
import { sha256 } from 'js-sha256';
import { FileInit } from './serializable/FileInit';
import { FileChunkGet } from './serializable/FileChunkGet';
import { FileChunkPost } from './serializable/FileChunkPost';
import { FileDelete } from './serializable/FileDelete';
import { Metadata } from './serializable/Metadata';

export async function uploadFileChunks(
  contract: SmartContract,
  chunks: FileChunkPost[],
) {
  const op = await contract.call(
    'uploadFileChunks',
    new Args().addSerializableObjectArray(chunks).serialize(),
  );

  await op.waitSpeculativeExecution();
}

export async function filesInit(
  contract: SmartContract,
  chunks: FileInit[],
  fileToDelete: FileInit[] = [],
  globalMetadata: Metadata[] = [],
) {
  const op = await contract.call(
    'filesInit',
    new Args()
      .addSerializableObjectArray(chunks)
      .addSerializableObjectArray(fileToDelete)
      .addSerializableObjectArray(globalMetadata)
      .serialize(),
  );

  await op.waitSpeculativeExecution();
}

export async function deleteFiles(
  contract: SmartContract,
  locationArray: string[],
) {
  const deleteArray: FileDelete[] = [];

  for (const location of locationArray) {
    deleteArray.push(
      new FileDelete(new Uint8Array(sha256.arrayBuffer(location))),
    );
  }

  const op = await contract.call(
    'deleteFiles',
    new Args().addSerializableObjectArray(deleteArray).serialize(),
  );

  await op.waitSpeculativeExecution();
}

export async function getFileLocations(
  contract: SmartContract,
): Promise<string[]> {
  const fileList = await contract.read(
    'getFileLocations',
    new Args().serialize(),
  );
  return new Args(fileList.value).nextArray(ArrayTypes.STRING);
}

export async function assertFilePathInList(
  contract: SmartContract,
  locations: string[],
): Promise<void> {
  const list = await getFileLocations(contract);
  // eslint-disable-next-line guard-for-in
  for (let location of locations) {
    if (!list.includes(location)) {
      throw new Error(`File not found in list: ${location}`);
    }
    console.log(`File found in list: ${location}`);
  }
}

export async function assertChunkExists(
  contract: SmartContract,
  chunk: FileChunkPost,
): Promise<void> {
  const chunkGet = new FileChunkGet(
    new Uint8Array(sha256.arrayBuffer(chunk.location)),
    chunk.index,
  );

  const result = await contract.read(
    'getFileChunk',
    new Args().addSerializable(chunkGet).serialize(),
  );

  if (result.value.length !== chunk.data.length)
    throw new Error('Invalid chunk');

  console.log(`Chunk found: ${chunk.location} ${chunk.index}`);
}

export async function assertFileIsDeleted(
  contract: SmartContract,
  location: string,
) {
  // assert that the file is deleted from the list
  const list = await getFileLocations(contract);
  for (let file of list) {
    if (file === location) {
      throw new Error(`File still exists in list: ${location}`);
    }

    // IMPROVE: assert that the file is deleted from the chunks
  }

  console.log(`File successfully deleted ${location} from list`);
}

export async function assertListIsEmpty(contract: SmartContract) {
  const list = await getFileLocations(contract);

  if (list.length !== 0) {
    throw new Error('List is not empty');
  }

  console.log('All files have been deleted');
}
