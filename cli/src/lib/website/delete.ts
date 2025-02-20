import {
  Args,
  ArrayTypes,
  OperationStatus,
  SmartContract,
} from '@massalabs/massa-web3'

import { listFiles } from './read'
import { getGlobalMetadata } from './metadata'

import { FileDelete } from './models/FileDelete'
import { Metadata } from './models/Metadata'

/**
 * Prepares the data required to delete a website.
 * @param sc - The smart contract instance.
 * @returns An object containing the file deletes and global metadata.
 */
export async function prepareDeleteWebsite(sc: SmartContract): Promise<{
  fileDeletes: FileDelete[]
  globalMetadatas: Metadata[]
}> {
  const {files: filePaths, notFoundKeys} = await listFiles(sc.provider, sc.address)
  if (notFoundKeys.length > 0) {
    throw new Error('Could not retrieve the file location value of some location storage keys: ' + notFoundKeys)
  }
  const globalMetadatas = await getGlobalMetadata(sc.provider, sc.address)

  const fileDeletes = filePaths.map((filePath) => new FileDelete(filePath))

  return { fileDeletes, globalMetadatas }
}

/**
 * Deletes the website by removing files and global metadata.
 * @param sc - The smart contract instance.
 * @param fileDeletes - The files to delete.
 * @param globalMetadatas - The global metadata to delete.
 */
export async function deleteWebsite(
  sc: SmartContract,
  fileDeletes: FileDelete[],
  globalMetadatas: Metadata[]
): Promise<void> {
  try {
    if (fileDeletes.length !== 0) {
      await executeDeleteOperation(
        sc,
        'deleteFiles',
        new Args().addSerializableObjectArray(fileDeletes),
        true
      )
    }

    if (globalMetadatas.length !== 0) {
      await executeDeleteOperation(
        sc,
        'removeMetadataGlobal',
        new Args().addArray(
          globalMetadatas.map((m) => m.key),
          ArrayTypes.STRING
        ),
        false
      )
    }
  } catch (error) {
    console.error('Error deleting website:', error)
    throw error
  }
}

/**
 * Executes a delete operation and checks the status.
 * @param sc - The smart contract instance.
 * @param methodName - The method name to call.
 * @param args - The arguments to pass to the method.
 * @param speculative - Whether to wait for speculative execution or final execution.
 */
async function executeDeleteOperation(
  sc: SmartContract,
  methodName: string,
  args: Args,
  speculative: boolean
): Promise<void> {
  const operation = await sc.call(methodName, args)
  const status = speculative
    ? await operation.waitSpeculativeExecution()
    : await operation.waitFinalExecution()

  if (
    status !== OperationStatus.SpeculativeSuccess &&
    status !== OperationStatus.Success
  ) {
    throw new Error(
      `Failed to execute ${methodName} (status: ${status.toString()})`
    )
  }
}
