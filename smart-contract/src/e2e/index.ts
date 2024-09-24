/* eslint-disable no-console */
import { testDeleteFiles } from './delete';
import { testStoreFiles } from './store';

async function main() {
  console.log('Starting tests...');
  console.log('Testing store files...');
  const contract = await testStoreFiles();
  console.log('Testing deletion...');
  await testDeleteFiles(contract);
  console.log('Tests finished');
}

main();
