import { MAX_STORAGE_VALUE_SIZE } from '../utils/const';

// TODO: Do we really need this?
export function _verifyStorageValueSize(chunks: StaticArray<u8>): void {
  assert(chunks.length <= MAX_STORAGE_VALUE_SIZE, 'Chunk size is too large');
}
