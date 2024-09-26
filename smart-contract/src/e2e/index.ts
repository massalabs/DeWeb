/* eslint-disable no-console */
import {
  Account,
  Mas,
  SmartContract,
  Web3Provider,
} from '@massalabs/massa-web3';
import { generateWebsite, testDeleteFiles, testDeleteWebsite } from './delete';
import { testStoreFiles } from './store';
import { getByteCode } from '../utils';
import { CONTRACT_FILE } from './helpers/const';

async function deploy(provider: Web3Provider): Promise<SmartContract> {
  const byteCode = getByteCode('build', CONTRACT_FILE);
  const contract = await SmartContract.deploy(provider, byteCode, undefined, {
    coins: Mas.fromString('50'),
  });

  console.log('Contract deployed at:', contract.address);

  return contract;
}

async function generateContract(): Promise<SmartContract> {
  console.log('Starting first tests...');
  const account = await Account.fromEnv();
  const provider = Web3Provider.buildnet(account);
  const contract = await deploy(provider);
  return contract;
}

async function main() {
  const contract = await generateContract();
  console.log('Testing store files...');
  await testStoreFiles(contract);
  console.log('Finished test\n');
  console.log('Testing file deletion...');
  await testDeleteFiles(contract);
  console.log('Finished test\n');
  console.log('Testing website deletion...');
  await generateWebsite(contract);
  await testDeleteWebsite(contract);
  console.log('Finished test\n');
}

main();
