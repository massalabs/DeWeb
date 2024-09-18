import { Args, ArrayTypes, SmartContract } from '@massalabs/massa-web3'

/**
 * Lists files from the given website on Massa blockchain
 * @param sc - SmartContract instance
 * @returns List of file paths in the website
 */
export async function listFiles(sc: SmartContract): Promise<string[]> {
  const fileListRaw = await sc.read('getFilePathList', undefined)
  const fileListArgs = new Args(fileListRaw.value)

  return fileListArgs.nextArray(ArrayTypes.STRING)
}
