import { SmartContract } from '@massalabs/massa-web3';
import {
  assertFileIsDeleted,
  assertListIsEmpty,
  deleteFile,
  deleteFiles,
} from './helpers';
import { CSS_FILE, HTML_FILE, JS_FILE } from './helpers/const';

export async function _deleteFile(contract: SmartContract) {
  console.log('Deleting 1 file');
  await deleteFile(contract, HTML_FILE);
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
