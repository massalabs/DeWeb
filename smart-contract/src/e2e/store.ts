/* eslint-disable no-console */
import { SmartContract } from '@massalabs/massa-web3';
import { getByteCode } from '../utils';
import {
  uploadFileChunks,
  assertFilePathInList,
  assertChunkExists,
  filesInit,
} from './helpers';
import { CSS_FILE, HTML_FILE, JS_FILE } from './helpers/const';
import { sha256 } from 'js-sha256';
import { FileInit } from './helpers/serializable/FileInit';
import { FileChunkPost } from './helpers/serializable/FileChunkPost';

const CHUNK_LIMIT = 4 * 1024;
const projectPath = 'src/e2e/test-project/dist';

export async function testStoreFiles(contract: SmartContract) {
  const htmlFileInit = new FileInit(
    HTML_FILE,
    new Uint8Array(sha256.arrayBuffer(HTML_FILE)),
    1n,
  );

  const cssFileInit = new FileInit(
    CSS_FILE,
    new Uint8Array(sha256.arrayBuffer(CSS_FILE)),
    1n,
  );

  const jsFileInit = new FileInit(
    JS_FILE,
    new Uint8Array(sha256.arrayBuffer(JS_FILE)),
    2n,
  );

  await filesInit(contract, [htmlFileInit, cssFileInit, jsFileInit]);

  const chunkHtml = new FileChunkPost(
    HTML_FILE,
    0n,
    getByteCode(projectPath, HTML_FILE),
  );

  console.log('Uploading Html file...');
  await uploadFileChunks(contract, [chunkHtml]);

  await assertFilePathInList(contract, [HTML_FILE]);
  await assertChunkExists(contract, chunkHtml);

  // Add multiple files
  const chunkCss = new FileChunkPost(
    CSS_FILE,
    0n,
    getByteCode(`${projectPath}/assets`, CSS_FILE),
  );

  // Calculate remaining bytes to fit css and part of js file
  const remainingBytes = CHUNK_LIMIT - chunkCss.data.length;
  const jsFile = getByteCode(`${projectPath}/assets`, JS_FILE);
  const jsPart1 = jsFile.subarray(0, remainingBytes);
  const jsPart2 = jsFile.subarray(remainingBytes);

  const chunkJsPart1 = new FileChunkPost(JS_FILE, 0n, jsPart1);
  const chunkJsPart2 = new FileChunkPost(JS_FILE, 1n, jsPart2);

  // Css file is small enough to be uploaded in one chunk so we will add a part of the js file
  // Js file is too big so we will split it in multiple chunks
  console.log('Uploading Css and part of Js file...');
  await uploadFileChunks(contract, [chunkCss, chunkJsPart1]);
  console.log('Uploading remaining part of Js file...');
  await uploadFileChunks(contract, [chunkJsPart2]);

  await assertFilePathInList(contract, [HTML_FILE, CSS_FILE, JS_FILE]);

  // Get chunks
  await assertChunkExists(contract, chunkCss);
  await assertChunkExists(contract, chunkJsPart1);
  await assertChunkExists(contract, chunkJsPart2);
}
