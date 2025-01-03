import {
  balance,
  Context,
  generateEvent,
  setBytecode,
  Storage,
  transferCoins,
} from '@massalabs/massa-as-sdk';
import {
  _onlyOwner,
  _setOwner,
} from '@massalabs/sc-standards/assembly/contracts/utils/ownership-internal';
import { Args, stringToBytes } from '@massalabs/as-types';
import { FileChunkPost } from './serializable/FileChunkPost';
import { FileDelete } from './serializable/FileDelete';
import { Metadata } from './serializable/Metadata';
import {
  _editFileMetadata,
  _editGlobalMetadata,
  _removeFileMetadata,
  _removeGlobalMetadata,
} from './internals/metadata';
import {
  _setFileChunk,
  _getTotalChunk,
  _deleteFile,
  _removeChunksRange,
} from './internals/chunks';
import { _fileInit } from './internals/fileInit';
import { FileInit } from './serializable/FileInit';
import { DEWEB_VERSION_TAG } from './internals/storageKeys/tags';
export { setOwner } from '@massalabs/sc-standards/assembly/contracts/utils/ownership';

const DEWEB_VERSION = '1';

/**
 * Initializes the smart contract.
 * Sets the contract deployer as the owner.
 */
export function constructor(_: StaticArray<u8>): void {
  if (!Context.isDeployingContract()) return;

  Storage.set(DEWEB_VERSION_TAG, stringToBytes(DEWEB_VERSION));

  _setOwner(Context.caller().toString());
}

/* -------------------------------------------------------------------------- */
/*                             FILE INITIALIZATION                            */
/* -------------------------------------------------------------------------- */

/**
 * Initializes the contract storage with the given files and metadata.
 * @param _binaryArgs - Serialized arguments containing arrays of FileInit objects,
 *                      files to delete, and global metadata.
 * @throws If the files are invalid or if the caller is not the owner.
 */
export function filesInit(_binaryArgs: StaticArray<u8>): void {
  _onlyOwner();

  const args = new Args(_binaryArgs);
  const files = args
    .nextSerializableObjectArray<FileInit>()
    .expect('Invalid files to initialize');

  const filesToDelete = args
    .nextSerializableObjectArray<FileDelete>()
    .expect('Invalid files to delete');

  const globalMetadata = args
    .nextSerializableObjectArray<Metadata>()
    .expect('Invalid global metadata');

  const globalMetadataToDelete = args
    .nextSerializableObjectArray<Metadata>()
    .expect('Invalid global metadata to delete');

  for (let i = 0; i < globalMetadataToDelete.length; i++) {
    _removeGlobalMetadata(stringToBytes(globalMetadataToDelete[i].key));
  }

  for (let i = 0; i < filesToDelete.length; i++) {
    _deleteFile(filesToDelete[i].hashLocation);
  }

  for (let i = 0; i < globalMetadata.length; i++) {
    _editGlobalMetadata(
      stringToBytes(globalMetadata[i].key),
      stringToBytes(globalMetadata[i].value),
    );
  }

  for (let i = 0; i < files.length; i++) {
    _fileInit(files[i].location, files[i].totalChunk, files[i].metadata);
  }

  // Send the freed coins back to the caller
  transferCoins(Context.caller(), balance());
}

/* -------------------------------------------------------------------------- */
/*                                   FILES                                    */
/* -------------------------------------------------------------------------- */

/**
 * Uploads chunks of a file to the contract storage.
 * Only the contract owner can call this function.
 * @param _binaryArgs - Serialized arguments containing an array of FileChunkPost objects.
 * @throws If the chunks are invalid or if the caller is not the owner.
 */
export function uploadFileChunks(_binaryArgs: StaticArray<u8>): void {
  _onlyOwner();

  const args = new Args(_binaryArgs);
  const chunks = args
    .nextSerializableObjectArray<FileChunkPost>()
    .expect('Invalid chunks');

  for (let i = 0; i < chunks.length; i++) {
    _setFileChunk(chunks[i].location, chunks[i].index, chunks[i].data);
  }

  // Send the freed coins back to the caller
  transferCoins(Context.caller(), balance());
}

export function removeFileChunkRange(_binaryArgs: StaticArray<u8>): void {
  _onlyOwner();
  const args = new Args(_binaryArgs);
  const hashLocation = args
    .next<StaticArray<u8>>()
    .expect('Invalid hashLocation');

  const start = args.next<u32>().expect('Invalid start');
  const end = args.next<u32>().expect('Invalid end');

  _removeChunksRange(hashLocation, start, end);

  // Send the freed coins back to the caller
  transferCoins(Context.caller(), balance());
}

/**
 * Deletes files from the contract storage.
 * Only the contract owner can call this function.
 * @param _binaryArgs - Serialized arguments containing an array of FileDelete objects.
 * @throws If the files are invalid or if the caller is not the owner.
 */
export function deleteFiles(_binaryArgs: StaticArray<u8>): void {
  _onlyOwner();

  const args = new Args(_binaryArgs);
  const files = args
    .nextSerializableObjectArray<FileDelete>()
    .expect('Invalid files');

  for (let i = 0; i < files.length; i++) {
    assert(_getTotalChunk(files[i].hashLocation) > 0, 'File does not exist');

    _deleteFile(files[i].hashLocation);
  }

  // Send the freed coins back to the caller
  transferCoins(Context.caller(), balance());
}

/* -------------------------------------------------------------------------- */
/*                               GLOBAL METADATA                              */
/* -------------------------------------------------------------------------- */

/**
 * Sets the global metadata of the contract.
 * Only the contract owner can call this function.
 * @param _binaryArgs - Serialized arguments containing an array of Metadata objects.
 * @throws If the caller is not the owner.
 */
export function setMetadataGlobal(_binaryArgs: StaticArray<u8>): void {
  _onlyOwner();

  const args = new Args(_binaryArgs);
  const metadata = args
    .nextSerializableObjectArray<Metadata>()
    .expect('Invalid metadata');

  for (let i = 0; i < metadata.length; i++) {
    _editGlobalMetadata(
      stringToBytes(metadata[i].key),
      stringToBytes(metadata[i].value),
    );
  }

  // Send the freed coins back to the caller
  transferCoins(Context.caller(), balance());
}

/**
 * Removes specific global metadata entries.
 * Only the contract owner can call this function.
 * @param _binaryArgs - Serialized arguments containing an array of metadata keys to remove.
 * @throws If the caller is not the owner or if the metadata request is invalid.
 */
export function removeMetadataGlobal(_binaryArgs: StaticArray<u8>): void {
  _onlyOwner();

  const args = new Args(_binaryArgs);
  const key = args.next<string[]>().expect('Invalid key');

  for (let i = 0; i < key.length; i++) {
    _removeGlobalMetadata(stringToBytes(key[i]));
  }

  // Send the freed coins back to the caller
  transferCoins(Context.caller(), balance());
}

/* -------------------------------------------------------------------------- */
/*                                FILE METADATA                               */
/* -------------------------------------------------------------------------- */

/**
 * Sets the metadata for a specific file.
 * Only the contract owner can call this function.
 * @param _binaryArgs - Serialized arguments containing the file's hashLocation and an array of Metadata objects.
 * @throws If the caller is not the owner.
 */
export function setMetadataFile(_binaryArgs: StaticArray<u8>): void {
  _onlyOwner();
  const args = new Args(_binaryArgs);
  const hashLocation = args
    .next<StaticArray<u8>>()
    .expect('Invalid hashLocation');
  const metadata = args
    .nextSerializableObjectArray<Metadata>()
    .expect('Invalid metadata');

  for (let i = 0; i < metadata.length; i++) {
    _editFileMetadata(
      stringToBytes(metadata[i].key),
      stringToBytes(metadata[i].value),
      hashLocation,
    );
  }

  // Send the freed coins back to the caller
  transferCoins(Context.caller(), balance());
}

/**
 * Removes specific metadata entries for a file.
 * Only the contract owner can call this function.
 * @param _binaryArgs - Serialized arguments containing the file's hashLocation and an array of MetadataDelete objects.
 * @throws If the caller is not the owner.
 */
export function removeMetadataFile(_binaryArgs: StaticArray<u8>): void {
  _onlyOwner();
  const args = new Args(_binaryArgs);

  const hashLocation = args
    .next<StaticArray<u8>>()
    .expect('Invalid hashLocation');

  const metadata = args.next<string[]>().expect('Invalid key');

  for (let i = 0; i < metadata.length; i++) {
    _removeFileMetadata(stringToBytes(metadata[i]), hashLocation);
  }

  // Send the freed coins back to the caller
  transferCoins(Context.caller(), balance());
}

/* -------------------------------------------------------------------------- */
/*                              COINS MANAGEMENT                              */
/* -------------------------------------------------------------------------- */

/**
 * Allows the owner to withdraw funds from the contract balance.
 * Only the contract owner can call this function.
 * @param binaryArgs - Serialized amount to withdraw.
 * @throws If the caller is not the owner, the amount is invalid, or the contract has insufficient balance.
 */
export function withdrawCoins(binaryArgs: StaticArray<u8>): void {
  _onlyOwner();
  const args = new Args(binaryArgs);
  const amount = args.next<u64>().expect('Invalid amount');
  assert(amount > 0, 'Invalid amount');
  assert(balance() >= amount, 'Contract has insufficient balance');

  transferCoins(Context.caller(), amount);
}

export function receiveCoins(): void {
  generateEvent('CoinsReceived: ' + Context.transferredCoins().toString());
}

/* -------------------------------------------------------------------------- */
/*                                 UPGRADE SC                                 */
/* -------------------------------------------------------------------------- */

/**
 * Upgrades the smart contract bytecode.
 * Only the contract owner can call this function.
 * @param args - The new bytecode to set.
 * @throws If the caller is not the owner.
 */
export function upgradeSC(args: StaticArray<u8>): void {
  _onlyOwner();
  setBytecode(args);
  
  // Send the freed coins back to the caller
  transferCoins(Context.caller(), balance());
}


/* -------------------------------------------------------------------------- */
/*                                 PURGE   SC                                 */
/* -------------------------------------------------------------------------- */

/**
 * Deletes all the contract storage and bytecode.
 * Sends back the freed coins to the caller.
 * @param args - Ignored.
 * @throws If the caller is not the owner.
 */
export function purge(args: StaticArray<u8>): void {
  _onlyOwner();

  // Delete all datastore entries
  const keys = Storage.getKeys([]);
  for (let i: u32 = 0; i < u32(keys.length); i++) {
    Storage.del(keys[i]);
  }

  // Empty the bytecode
  setBytecode([]);

  // Send the freed coins back to the caller
  transferCoins(Context.caller(), balance());
}
