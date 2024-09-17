/* eslint-disable no-console */
import {
  Account,
  Mas,
  SmartContract,
  Web3Provider,
} from '@massalabs/massa-web3';
import { getByteCode } from './utils';

async function deploy(provider: Web3Provider): Promise<SmartContract> {
  const byteCode = getByteCode('build', 'deweb-interface.wasm');
  return await SmartContract.deploy(provider, byteCode, undefined, {
    // TODO: Calculate the amount of coins to send
    coins: Mas.fromString('0.01'),
  });
}

async function main() {
  const account = await Account.fromEnv();
  const provider = Web3Provider.newPublicBuildnetProvider(account);
  const contract = await deploy(provider);
  console.log(`Contract deployed at: ${contract.address}`);
}

main();
