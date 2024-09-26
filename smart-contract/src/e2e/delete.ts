/* eslint-disable no-console */
import { Args, SmartContract } from '@massalabs/massa-web3';
import {
  assertFileIsDeleted,
  assertListIsEmpty,
  deleteFiles,
  preStoreChunks,
  storeChunk,
} from './helpers';
import {
  CHUNK_LIMIT,
  CSS_FILE,
  HTML_FILE,
  JS_FILE,
  projectPath,
} from './helpers/const';
import { PreStore } from './helpers/serializable/Chunk';
import { sha256 } from 'js-sha256';
import { generateChunk } from './store';
import { getByteCode } from '../utils';

export async function _deleteFile(contract: SmartContract) {
  console.log('Deleting 1 file');
  await deleteFiles(contract, [HTML_FILE]);
  await assertFileIsDeleted(contract, HTML_FILE);
}

export async function _deleteFiles(contract: SmartContract) {
  console.log('Deleting multiple files');
  await deleteFiles(contract, [JS_FILE, CSS_FILE]);
  await assertListIsEmpty(contract);
}

export async function testDeleteFiles(contract: SmartContract) {
  await _deleteFile(contract);
  await _deleteFiles(contract);
}

export async function testDeleteWebsite(contract: SmartContract) {
  console.log('Deleting website...');
  const op = await contract.call('deleteWebsite', new Args().serialize());
  await op.waitSpeculativeExecution();

  await assertListIsEmpty(contract);
}

export async function generateWebsite(contract: SmartContract) {
  const htmlPreStore = new PreStore(
    HTML_FILE,
    new Uint8Array(sha256.arrayBuffer(HTML_FILE)),
    1n,
  );

  const cssPreStore = new PreStore(
    CSS_FILE,
    new Uint8Array(sha256.arrayBuffer(CSS_FILE)),
    1n,
  );

  await preStoreChunks(contract, [htmlPreStore, cssPreStore]);

  const chunkHtml = generateChunk(
    HTML_FILE,
    getByteCode(projectPath, HTML_FILE),
    0n,
  );

  const chunkCss = generateChunk(
    CSS_FILE,
    getByteCode(`${projectPath}/assets`, CSS_FILE),
    0n,
  );

  await storeChunk(contract, [chunkHtml]);
  await storeChunk(contract, [chunkCss]);
}
