import { Context } from '@massalabs/massa-as-sdk';
import {
  _onlyOwner,
  _setOwner,
} from '@massalabs/sc-standards/assembly/contracts/utils/ownership-internal';
import { ChunkPost, ChunkGet } from './serializable/Chunk';
import { Args, u32ToBytes } from '@massalabs/as-types';
import { _getFileChunk, _getNbChunk, _setFileChunk } from './internals/chunks';
import { FILES_PATH_LIST } from './utils/const';

// TODO - Add a setBytecode function to the SmartContract to upgrade version
// TODO - Add a way to make it immutable
// TODO - Add a lastModified timestamp in Storage

export function constructor(_: StaticArray<u8>): void {
  if (!Context.isDeployingContract()) return;
  _setOwner(Context.caller().toString());
  FILES_PATH_LIST.set([]);
}

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

export function getFilePathList(): StaticArray<u8> {
  return new Args().add(FILES_PATH_LIST.mustValue()).serialize();
}

export function getChunk(_binaryArgs: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(_binaryArgs);
  const chunk = args.next<ChunkGet>().expect('Invalid chunk');
  return _getFileChunk(chunk.filePathHash, chunk.chunkId);
}

export function getChunkNb(_binaryArgs: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(_binaryArgs);
  const filePathHash = args
    .next<StaticArray<u8>>()
    .expect('Invalid filePathHash');

  return u32ToBytes(_getNbChunk(filePathHash));
}
