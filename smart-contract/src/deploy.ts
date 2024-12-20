/* eslint-disable no-console */
import {
  Account,
  Args,
  Mas,
  SmartContract,
  Web3Provider,
} from '@massalabs/massa-web3';
import { getByteCode } from './utils';

async function deploy(provider: Web3Provider): Promise<SmartContract> {
  const byteCode = getByteCode('build', 'deweb-interface.wasm');
  return await SmartContract.deploy(
    provider,
    byteCode,
    new Args().addString(provider.address).serialize(),
    {
      coins: Mas.fromString('0.01'),
    },
  );
}

async function main() {
  const account = await Account.fromEnv();
  const provider = Web3Provider.buildnet(account);
  const contract = await deploy(provider);
  console.log(`Contract deployed at: ${contract.address}`);
}

main();
