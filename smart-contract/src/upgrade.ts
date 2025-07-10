import {
  Account,
  Mas,
  SmartContract,
  Web3Provider,
} from '@massalabs/massa-web3';
import { getByteCode } from './utils';

const CONTRACT_ADDR = 'AS1BsB34Hq7VGpGG26cudgFr15nshSeJfAkkf6WGY8JcXbG6kzUg';

const account = await Account.fromEnv();
const provider = Web3Provider.mainnet(account);
const contract = new SmartContract(provider, CONTRACT_ADDR);

const byteCode = getByteCode('build', 'deweb-interface.wasm');

const operation = await contract.call('upgradeSC', byteCode, {
  coins: Mas.fromString('3'),
  fee: Mas.fromString('0.1'),
});

const events = await operation.getSpeculativeEvents();
for (const event of events) {
  console.log('upgradeSC Events:', event.data);
}
