/* eslint-disable no-console */
import { testStoreFiles } from './store';

async function main() {
  console.log('Starting tests...');
  console.log('Testing store files...');
  await testStoreFiles();
  console.log('Tests finished');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
