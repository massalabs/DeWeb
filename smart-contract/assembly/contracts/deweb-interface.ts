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

import { Args, stringToBytes, u32ToBytes } from '@massalabs/as-types';
import { FileChunkPost } from './serializable/FileChunkPost';
import { FileDelete } from './serializable/FileDelete';
import { FileChunkGet } from './serializable/FileChunkGet';
import { Metadata } from './serializable/Metadata';
import {
  _editFileMetadata,
  _editGlobalMetadata,
  _getFileMetadata,
  _getGlobalMetadata,
  _removeFileMetadata,
  _removeGlobalMetadata,
} from './internals/metadata';
import {
  _setFileChunk,
  _getFileChunk,
  _getTotalChunk,
  _deleteFile,
  _removeChunksRange,
} from './internals/chunks';
import { _getFileLocations } from './internals/location';
import { _fileInit } from './internals/fileInit';
import { FileInit } from './serializable/FileInit';
import { DEWEB_VERSION_TAG } from './internals/storageKeys/tags';

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
}

/**
 * Retrieves a specific chunk of a file.
 * @param _binaryArgs - Serialized FileChunkGet object containing hashLocation and index.
 * @returns The requested chunk as a StaticArray<u8>.
 * @throws If the chunk request is invalid.
 */
export function getFileChunk(_binaryArgs: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(_binaryArgs);
  const chunk = args.next<FileChunkGet>().expect('Invalid chunk');
  return _getFileChunk(chunk.hashLocation, chunk.index);
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
}

/**
 * Retrieves the total number of chunks for a file.
 * @param _binaryArgs - Serialized FileChunkGet object containing hashLocation.
 * @returns The total number of chunks.
 * @throws If the hashLocation is invalid.
 */
export function getFileChunkCount(
  _binaryArgs: StaticArray<u8>,
): StaticArray<u8> {
  const args = new Args(_binaryArgs);
  const hashLocation = args
    .next<StaticArray<u8>>()
    .expect('Invalid hashLocation');

  return u32ToBytes(_getTotalChunk(hashLocation));
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
}

/**
 * Retrieves the list of file locations.
 * @returns A StaticArray<u8> containing serialized array of strings.
 */
export function getFileLocations(): StaticArray<u8> {
  return new Args().add(_getFileLocations()).serialize();
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
}

/**
 * Retrieves the global metadata for a specific key.
 * @param _binaryArgs - Serialized arguments containing the metadata key.
 * @returns The requested global metadata as a StaticArray<u8>.
 * @throws If the metadata request is invalid or the metadata is not found.
 */
export function getMetadataGlobal(
  _binaryArgs: StaticArray<u8>,
): StaticArray<u8> {
  const args = new Args(_binaryArgs);
  const key = args.next<StaticArray<u8>>().expect('Invalid key');

  return _getGlobalMetadata(key);
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
}

/**
 * Retrieves the metadata of a specific file for a given key.
 * @param _binaryArgs - Serialized arguments containing the file's hashLocation and metadata key.
 * @returns The requested file metadata as a StaticArray<u8>.
 * @throws If the metadata request is invalid or the metadata is not found.
 */
export function getMetadataFile(_binaryArgs: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(_binaryArgs);
  const hashLocation = args
    .next<StaticArray<u8>>()
    .expect('Invalid hashLocation');
  const key = args.next<StaticArray<u8>>().expect('Invalid key');

  return _getFileMetadata(hashLocation, key);
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
/*                                  OWNERSHIP                                 */
/* -------------------------------------------------------------------------- */

/**
 * Changes the owner of the contract.
 * Only the current owner can call this function.
 * @param _binaryArgs - Serialized new owner address.
 * @throws If the caller is not the owner or the new owner address is invalid.
 */
export function setOwner(_binaryArgs: StaticArray<u8>): void {
  _onlyOwner();
  const args = new Args(_binaryArgs);
  _setOwner(args.next<string>().expect('Invalid owner'));
}

/* -------------------------------------------------------------------------- */
/*                                  UPGRADE                                   */
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
}
