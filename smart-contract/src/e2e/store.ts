/* eslint-disable no-console */
import { Provider, SmartContract } from '@massalabs/massa-web3';
import { getByteCode } from '../utils';

import { CSS_FILE, HTML_FILE, JS_FILE } from './helpers/const';
import { FileInit } from './helpers/serializable/FileInit';
import { FileChunkPost } from './helpers/serializable/FileChunkPost';
import {
  assertFileIsUploaded,
  assertFilePathInList,
  filesInit,
  uploadFileChunks,
} from './helpers/files';

const CHUNK_LIMIT = 4 * 1024;
const projectPath = 'src/e2e/test-project/dist';

export async function testStoreFiles(contract: SmartContract) {
  const htmlByteCode = getByteCode(projectPath, HTML_FILE);
  const cssByteCode = getByteCode(`${projectPath}/assets`, CSS_FILE);
  const jsByteCode = getByteCode(`${projectPath}/assets`, JS_FILE);

  const htmlFileInit = new FileInit(HTML_FILE, 1n);
  const cssFileInit = new FileInit(CSS_FILE, 1n);
  const jsFileInit = new FileInit(JS_FILE, 2n);

  await filesInit(contract, [htmlFileInit, cssFileInit, jsFileInit]);

  console.log('Uploading Html file...');
  const chunkHtml = new FileChunkPost(HTML_FILE, 0n, htmlByteCode);
  await uploadFileChunks(contract, [chunkHtml]);
  await assertFilePathInList(contract, [HTML_FILE]);
  await assertFileIsUploaded(contract, HTML_FILE, htmlByteCode);
  console.log('Html file uploaded successfully');

  const chunkCss = new FileChunkPost(CSS_FILE, 0n, cssByteCode);
  const remainingBytes = CHUNK_LIMIT - chunkCss.data.length;
  const jsPart1 = jsByteCode.subarray(0, remainingBytes);
  const jsPart2 = jsByteCode.subarray(remainingBytes);

  const chunkJsPart1 = new FileChunkPost(JS_FILE, 0n, jsPart1);
  const chunkJsPart2 = new FileChunkPost(JS_FILE, 1n, jsPart2);

  console.log('Uploading Css and part of Js file...');
  await uploadFileChunks(contract, [chunkCss, chunkJsPart1]);
  console.log('Uploading remaining part of Js file...');
  await uploadFileChunks(contract, [chunkJsPart2]);

  await assertFilePathInList(contract, [HTML_FILE, CSS_FILE, JS_FILE]);

  assertFileIsUploaded(contract, CSS_FILE, cssByteCode);
  assertFileIsUploaded(contract, JS_FILE, jsByteCode);
}
