/* eslint-disable no-console */
import {
  Account,
  Mas,
  SmartContract,
  Web3Provider,
} from '@massalabs/massa-web3';
import { getByteCode } from '../utils';
import { ChunkPost, PreStore } from './helpers/serializable/Chunk';
import {
  storeChunk,
  assertFilePathInList,
  assertChunkExists,
  preStoreChunks,
} from './helpers';
import { CONTRACT_FILE, CSS_FILE, HTML_FILE, JS_FILE } from './helpers/const';
import { sha256 } from 'js-sha256';

const CHUNK_LIMIT = 4 * 1024;
const projectPath = 'src/e2e/test-project/dist';

async function deploy(provider: Web3Provider): Promise<SmartContract> {
  const byteCode = getByteCode('build', CONTRACT_FILE);
  const contract = await SmartContract.deploy(provider, byteCode, undefined, {
    coins: Mas.fromString('50'),
  });

  console.log('Contract deployed at:', contract.address);

  return contract;
}

export function generateChunk(
  filePath: string,
  data: Uint8Array,
  id: bigint,
): ChunkPost {
  return new ChunkPost(filePath, id, data);
}

async function testStoreChunks(contract: SmartContract) {
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

  const jsPreStore = new PreStore(
    JS_FILE,
    new Uint8Array(sha256.arrayBuffer(JS_FILE)),
    2n,
  );

  await preStoreChunks(contract, [htmlPreStore, cssPreStore, jsPreStore]);

  const chunkHtml = generateChunk(
    HTML_FILE,
    getByteCode(projectPath, HTML_FILE),
    0n,
  );

  console.log('Uploading Html file...');
  await storeChunk(contract, [chunkHtml]);

  await assertFilePathInList(contract, [HTML_FILE]);
  await assertChunkExists(contract, chunkHtml);

  // Add multiple files
  const chunkCss = generateChunk(
    CSS_FILE,
    getByteCode(`${projectPath}/assets`, CSS_FILE),
    0n,
  );

  // Calculate remaining bytes to fit css and part of js file
  const remainingBytes = CHUNK_LIMIT - chunkCss.data.length;
  const jsFile = getByteCode(`${projectPath}/assets`, JS_FILE);
  const jsPart1 = jsFile.subarray(0, remainingBytes);
  const jsPart2 = jsFile.subarray(remainingBytes);

  // TODO: Put file name in const
  const chunkJsPart1 = generateChunk(JS_FILE, jsPart1, 0n);
  const chunkJsPart2 = generateChunk(JS_FILE, jsPart2, 1n);

  // Css file is small enough to be uploaded in one chunk so we will add a part of the js file
  // Js file is too big so we will split it in multiple chunks
  console.log('Uploading Css and part of Js file...');
  await storeChunk(contract, [chunkCss, chunkJsPart1]);
  console.log('Uploading remaining part of Js file...');
  await storeChunk(contract, [chunkJsPart2]);

  await assertFilePathInList(contract, [HTML_FILE, CSS_FILE, JS_FILE]);

  // Get chunks
  await assertChunkExists(contract, chunkCss);
  await assertChunkExists(contract, chunkJsPart1);
  await assertChunkExists(contract, chunkJsPart2);
}

export async function testStoreFiles() {
  const account = await Account.fromEnv();
  const provider = Web3Provider.buildnet(account);
  const contract = await deploy(provider);
  await testStoreChunks(contract);
  return contract;
}
