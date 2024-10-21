import {
  U32,
  Provider,
  SmartContract,
  bytesToStr,
  Args,
  ArrayTypes,
  MAX_GAS_CALL,
} from '@massalabs/massa-web3';
import { sha256 } from 'js-sha256';
import { FILE_TAG, CHUNK_NB_TAG, CHUNK_TAG, FILE_LOCATION_TAG } from './const';
import { FileChunkPost } from './serializable/FileChunkPost';
import { FileDelete } from './serializable/FileDelete';
import { FileInit } from './serializable/FileInit';
import { Metadata } from './serializable/Metadata';

export async function filesInit(
  contract: SmartContract,
  filesInit: FileInit[],
  fileToDelete: FileDelete[] = [],
  globalMetadata: Metadata[] = [],
  globalMetadataToDelete: Metadata[] = [],
) {
  const op = await contract.call(
    'filesInit',
    new Args()
      .addSerializableObjectArray(filesInit)
      .addSerializableObjectArray(fileToDelete)
      .addSerializableObjectArray(globalMetadata)
      .addSerializableObjectArray(globalMetadataToDelete)
      .serialize(),
    {
      maxGas: MAX_GAS_CALL,
    },
  );

  await op.waitSpeculativeExecution();
}

export function fileChunkCountKey(hashLocation: Uint8Array): Uint8Array {
  const newKey = new Uint8Array(
    FILE_TAG.length + CHUNK_NB_TAG.length + hashLocation.length,
  );
  var offset = 0;
  newKey.set(FILE_TAG, offset);
  offset += FILE_TAG.length;
  newKey.set(hashLocation, offset);
  offset += hashLocation.length;
  newKey.set(CHUNK_NB_TAG, offset);
  return newKey;
}

export async function getFileTotalChunks(
  provider: Provider,
  sc: SmartContract,
  filePath: string,
): Promise<bigint> {
  const locationHash = sha256.arrayBuffer(filePath);
  const fileTotalChunksResp = await provider.readStorage(
    sc.address,
    [fileChunkCountKey(new Uint8Array(locationHash))],
    false,
  );

  if (fileTotalChunksResp.length !== 1) {
    throw new Error('Invalid response from getDatastoreEntries');
  }
  const fileTotalChunksByteArray = fileTotalChunksResp[0];

  if (fileTotalChunksByteArray.length !== U32.SIZE_BYTE) {
    throw new Error(
      `Invalid length of fileTotalChunksByteArray, got ${fileTotalChunksByteArray.length}, expected ${U32.SIZE_BYTE}`,
    );
  }

  return U32.fromBytes(fileTotalChunksByteArray);
}

export function fileChunkKey(
  hashLocation: Uint8Array,
  index: bigint,
): Uint8Array {
  const newKey = new Uint8Array(
    FILE_TAG.length + hashLocation.length + CHUNK_TAG.length + U32.SIZE_BYTE,
  );
  var offset = 0;
  newKey.set(FILE_TAG, offset);
  offset += FILE_TAG.length;
  newKey.set(hashLocation, offset);
  offset += hashLocation.length;
  newKey.set(CHUNK_TAG, offset);
  offset += CHUNK_TAG.length;
  newKey.set(U32.toBytes(index), offset);
  return newKey;
}

export async function getFileFromAddress(
  provider: Provider,
  sc: SmartContract,
  filePath: string,
): Promise<Uint8Array> {
  const locationHash = sha256.arrayBuffer(filePath);
  const fileTotalChunks = await getFileTotalChunks(provider, sc, filePath);

  const datastoreKeys = [];
  for (let i = 0n; i < fileTotalChunks; i++) {
    datastoreKeys.push(fileChunkKey(new Uint8Array(locationHash), i));
  }

  const rawChunks = await provider.readStorage(
    sc.address,
    datastoreKeys,
    false,
  );

  for (let i = 0; i < rawChunks.length; i++) {
    if (rawChunks[i].length === 0) {
      throw new Error(`file ${filePath} Chunk ${i} not found`);
    }
  }

  const totalLength = rawChunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const concatenatedArray = new Uint8Array(totalLength);

  let offset = 0;
  for (const chunk of rawChunks) {
    concatenatedArray.set(chunk, offset);
    offset += chunk.length;
  }

  return concatenatedArray;
}

export async function listFilesLocations(
  provider: Provider,
  sc: SmartContract,
): Promise<string[]> {
  const fileKeys = await provider.getStorageKeys(
    sc.address,
    FILE_LOCATION_TAG,
    false,
  );

  const fileLocations = await provider.readStorage(sc.address, fileKeys, false);

  return fileLocations.map((location) => {
    return bytesToStr(location);
  });
}

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

/* -------------------------------------------------------------------------- */
/*                               ASSERT UPLOADED                              */
/* -------------------------------------------------------------------------- */

export async function assertFilePathInList(
  contract: SmartContract,
  locations: string[],
): Promise<void> {
  const list = await listFilesLocations(contract.provider, contract);

  for (let location of locations) {
    if (!list.includes(location)) {
      throw new Error(`File not found in list: ${location}`);
    }
  }
}

export async function assertFileIsUploaded(
  contract: SmartContract,
  location: string,
  file: Buffer,
) {
  const uploadedFile = await getFileFromAddress(
    contract.provider,
    contract,
    location,
  );

  if (bytesToStr(uploadedFile) !== file.toString()) {
    throw new Error('File does not match');
  }
}

/* -------------------------------------------------------------------------- */
/*                                ASSERT DELETE                               */
/* -------------------------------------------------------------------------- */

export async function assertFileIsDeleted(
  contract: SmartContract,
  location: string,
) {
  const list = await getFileLocations(contract);
  for (let file of list) {
    if (file === location) {
      throw new Error(`File still exists in list: ${location}`);
    }
    // IMPROVE: assert that the file is deleted from the chunks
  }
}

export async function assertListIsEmpty(contract: SmartContract) {
  const list = await getFileLocations(contract);

  if (list.length !== 0) {
    throw new Error('List is not empty');
  }
}
