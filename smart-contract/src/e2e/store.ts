/* eslint-disable no-console */
import {
  Account,
  Mas,
  SmartContract,
  Web3Provider,
} from '@massalabs/massa-web3';
import { getByteCode } from '../utils';
import { ChunkPost } from './helpers/serializable/Chunk';
import {
  uploadChunks,
  assertFilePathInList,
  assertChunkExists,
} from './helpers';

const CHUNK_LIMIT = 4 * 1024;
const projectPath = 'src/e2e/test-project/dist';

async function deploy(provider: Web3Provider): Promise<SmartContract> {
  const byteCode = getByteCode('build', 'deweb-interface.wasm');
  const contract = await SmartContract.deploy(provider, byteCode, undefined, {
    coins: Mas.fromString('50'),
  });

  console.log('Contract deployed at:', contract.address);

  return contract;
}

function generateChunk(
  filePath: string,
  data: Uint8Array,
  id: bigint,
): ChunkPost {
  return new ChunkPost(filePath, id, data);
}

async function testStoreChunks(contract: SmartContract) {
  const chunkHtml = generateChunk(
    'index.html',
    getByteCode(projectPath, 'index.html'),
    0n,
  );

  console.log('Uploading Html file...');
  await uploadChunks(contract, [chunkHtml]);

  await assertFilePathInList(contract, ['index.html']);
  await assertChunkExists(contract, chunkHtml);

  // Add multiple files
  const chunkCss = generateChunk(
    'index-DiwrgTda.css',
    getByteCode(`${projectPath}/assets`, 'index-DiwrgTda.css'),
    0n,
  );

  // Calculate remaining bytes to fit css and part of js file
  const remainingBytes = CHUNK_LIMIT - chunkCss.data.length;
  const jsFile = getByteCode(`${projectPath}/assets`, 'index-f40OySzR.js');
  const jsPart1 = jsFile.subarray(0, remainingBytes);
  const jsPart2 = jsFile.subarray(remainingBytes);

  const chunkJsPart1 = generateChunk('index-f40OySzR.js', jsPart1, 0n);
  const chunkJsPart2 = generateChunk('index-f40OySzR.js', jsPart2, 1n);

  // Css file is small enough to be uploaded in one chunk so we will add a part of the js file
  // Js file is too big so we will split it in multiple chunks
  console.log('Uploading Css and part of Js file...');
  await uploadChunks(contract, [chunkCss, chunkJsPart1]);
  console.log('Uploading remaining part of Js file...');
  await uploadChunks(contract, [chunkJsPart2]);

  await assertFilePathInList(contract, [
    'index.html',
    'index-DiwrgTda.css',
    'index-f40OySzR.js',
  ]);

  // Get chunks
  await assertChunkExists(contract, chunkCss);
  await assertChunkExists(contract, chunkJsPart1);
  await assertChunkExists(contract, chunkJsPart2);

  // const cssFile = bytesToArray<string>(resultCss.value, ArrayTypes.STRING);
}

export async function testStoreFiles() {
  const account = await Account.fromEnv();
  const provider = Web3Provider.buildnet(account);
  const contract = await deploy(provider);
  await testStoreChunks(contract);
}
