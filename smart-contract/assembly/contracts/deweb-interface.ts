import { Context } from '@massalabs/massa-as-sdk';
import {
  _onlyOwner,
  _setOwner,
} from '@massalabs/sc-standards/assembly/contracts/utils/ownership-internal';
import { ChunkPost, ChunkGet } from './serializable/Chunk';
import { Args, u32ToBytes } from '@massalabs/as-types';
import { _getFileChunk, _getNbChunk, _setFileChunk } from './internals/chunks';
import { FILES_PATH_LIST } from './utils/const';

/**
 * Initializes the smart contract.
 * Sets the contract deployer as the owner and initializes an empty file path list.
 * @param _ - Unused parameter (required).
 */
export function constructor(_: StaticArray<u8>): void {
  if (!Context.isDeployingContract()) return;
  _setOwner(Context.caller().toString());
  FILES_PATH_LIST.set([]);
}

/**
 * Stores file chunks in the contract storage.
 * Only the contract owner can call this function.
 * @param _binaryArgs - Serialized arguments containing an array of ChunkPost objects.
 * @throws If the chunks are invalid or if the caller is not the owner.
 */
export function storeFileChunks(_binaryArgs: StaticArray<u8>): void {
  _onlyOwner();
  const args = new Args(_binaryArgs);
  const chunks = args
    .nextSerializableObjectArray<ChunkPost>()
    .expect('Invalid chunks');

  for (let i = 0; i < chunks.length; i++) {
    _setFileChunk(
      chunks[i].filePath,
      chunks[i].chunkId,
      chunks[i].data,
      chunks[i].totalChunks,
    );
  }
}

/**
 * Retrieves the list of file paths stored in the contract.
 * @returns Serialized array of file paths.
 */
export function getFilePathList(): StaticArray<u8> {
  return new Args().add(FILES_PATH_LIST.mustValue()).serialize();
}

/**
 * Retrieves a specific chunk of a file.
 * @param _binaryArgs - Serialized ChunkGet object containing filePathHash and chunkId.
 * @returns The requested file chunk.
 * @throws If the chunk request is invalid.
 */
export function getChunk(_binaryArgs: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(_binaryArgs);
  const chunk = args.next<ChunkGet>().expect('Invalid chunk');
  return _getFileChunk(chunk.filePathHash, chunk.chunkId);
}

/**
 * Retrieves the total number of chunks for a specific file.
 * @param _binaryArgs - Serialized filePathHash.
 * @returns Serialized number of chunks.
 * @throws If the filePathHash is invalid.
 */
export function getNbOfChunks(_binaryArgs: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(_binaryArgs);
  const filePathHash = args
    .next<StaticArray<u8>>()
    .expect('Invalid filePathHash');

  return u32ToBytes(_getNbChunk(filePathHash));
}
