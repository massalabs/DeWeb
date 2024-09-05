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
  const contract = await SmartContract.deploy(provider, byteCode, undefined, {
    coins: Mas.fromString('50'),
  });

  console.log('Contract deployed at:', contract.address);

  return contract;
}

async function main() {
  const account = await Account.fromEnv();
  const provider = Web3Provider.newPublicBuildnetProvider(account);
  const contract = await deploy(provider);
  console.log(`Contract deployed at: ${contract.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
