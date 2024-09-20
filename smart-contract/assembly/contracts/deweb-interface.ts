import { balance, Context, transferCoins } from '@massalabs/massa-as-sdk';
import {
  _onlyOwner,
  _setOwner,
} from '@massalabs/sc-standards/assembly/contracts/utils/ownership-internal';
import { ChunkPost, ChunkGet, PreStore } from './serializable/Chunk';
import { Args, u32ToBytes } from '@massalabs/as-types';
import {
  _getFileChunk,
  _getTotalChunk,
  _removeChunksRange,
  _removeFile,
  _setFileChunk,
  _setTotalChunk,
} from './internals/chunks';
import { FILES_PATH_LIST } from './internals/const';
import { _pushFilePath } from './internals/file-list';

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
    _setFileChunk(chunks[i].filePath, chunks[i].index, chunks[i].data);
  }
}

/**
 * Prepares the storage of file chunks by setting the total number of chunks for each file.
 * Additionally, it removes any chunks that exceed the new total number of chunks.
 * Then, it removes the file if the new total number of chunks is 0.
 *
 * Only the contract owner can call this function.
 * @param _binaryArgs - Serialized arguments containing an array of PreStore objects.
 * @throws If the preStore data is invalid or if the caller is not the owner.
 */
export function preStoreFileChunks(_binaryArgs: StaticArray<u8>): void {
  _onlyOwner();
  const args = new Args(_binaryArgs);
  const files = args
    .nextSerializableObjectArray<PreStore>()
    .expect('Invalid preStore');

  for (let i = 0; i < files.length; i++) {
    const totalChunks = _getTotalChunk(files[i].filePathHash);

    if (totalChunks === 0) {
      _pushFilePath(files[i].filePath);
    }

    // Remove the file if the new total chunks is 0
    if (files[i].newTotalChunks === 0) {
      _removeFile(files[i].filePath, files[i].filePathHash, totalChunks - 1);
    } else {
      if (files[i].newTotalChunks < totalChunks) {
        _removeChunksRange(
          files[i].filePathHash,
          files[i].newTotalChunks - 1,
          totalChunks - 1,
        );
      }
      _setTotalChunk(files[i].filePathHash, files[i].newTotalChunks);
    }
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
 * @param _binaryArgs - Serialized ChunkGet object containing filePathHash and id.
 * @returns The requested file chunk.
 * @throws If the chunk request is invalid.
 */
export function getChunk(_binaryArgs: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(_binaryArgs);
  const chunk = args.next<ChunkGet>().expect('Invalid chunk');
  return _getFileChunk(chunk.filePathHash, chunk.index);
}

/**
 * Retrieves the total number of chunks for a specific file.
 * @param _binaryArgs - Serialized filePathHash.
 * @returns Serialized number of chunks.
 * @throws If the filePathHash is invalid.
 */
export function getTotalChunksForFile(
  _binaryArgs: StaticArray<u8>,
): StaticArray<u8> {
  const args = new Args(_binaryArgs);
  const filePathHash = args
    .next<StaticArray<u8>>()
    .expect('Invalid filePathHash');

  return u32ToBytes(_getTotalChunk(filePathHash));
}

/**
 * Allow the owner to withdraw funds from the contract balance.
 * Only the contract owner can call this function.
 * @param _binaryArgs - Serialized amount to withdraw.
 * @throws If the caller is not the owner.
 */
export function withdraw(binaryArgs: StaticArray<u8>): void {
  _onlyOwner();
  const args = new Args(binaryArgs);
  const amount = args.next<u64>().expect('Invalid amount');
  assert(amount > 0, 'Invalid amount');
  assert(balance() >= amount, 'Insufficient balance');

  transferCoins(Context.caller(), amount);
}
