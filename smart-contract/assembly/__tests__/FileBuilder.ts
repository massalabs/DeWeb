import {
  Args,
  bytesToI64,
  bytesToU64,
  stringToBytes,
} from '@massalabs/as-types';
import { sha256 } from '@massalabs/massa-as-sdk';
import { PreStore, ChunkPost, ChunkGet } from '../contracts/serializable/Chunk';
import {
  preStoreFileChunks,
  storeFileChunks,
  getFilePathList,
  getChunk,
  getProjectLastUpdate,
} from '../contracts/deweb-interface';
const limitChunk = 10240;

class FileInfo {
  fileName: string;
  fileNameHash: StaticArray<u8>;
  nbChunks: u32;
  data: StaticArray<u8>[];

  constructor(fileName: string, nbChunks: u32, data: StaticArray<u8>[] = []) {
    this.fileName = fileName;
    this.fileNameHash = sha256(stringToBytes(fileName));
    this.nbChunks = nbChunks;
    this.data = data;
  }
}

class FileBuilder {
  private files: FileInfo[];
  lastProjectUpdate: u64 = 0;

  constructor() {
    this.files = [];
  }

  withFile(fileName: string, fileData: StaticArray<u8>[]): FileBuilder {
    this.files.push(new FileInfo(fileName, u32(fileData.length), fileData));
    return this;
  }

  public preStore(): FileBuilder {
    const preStoreFiles: PreStore[] = [];
    for (let i = 0; i < this.files.length; i++) {
      const fileInfo = this.files[i];
      preStoreFiles.push(
        new PreStore(
          fileInfo.fileName,
          fileInfo.fileNameHash,
          fileInfo.nbChunks,
        ),
      );
    }

    preStoreFileChunks(
      new Args()
        .addSerializableObjectArray<PreStore>(preStoreFiles)
        .serialize(),
    );

    this.fetchLastProjectUpdate();

    return this;
  }

  store(fileName: string, index: u32): FileBuilder {
    let fileInfo: FileInfo | null = null;
    for (let i = 0; i < this.files.length; i++) {
      if (this.files[i].fileName == fileName) {
        fileInfo = this.files[i];
        break;
      }
    }

    if (fileInfo == null) {
      throw new Error(
        `File ${fileName} not initialized. Use withFile() first.`,
      );
    }

    const chunk = new ChunkPost(fileName, index, fileInfo.data[index]);

    storeFileChunks(
      new Args().addSerializableObjectArray<ChunkPost>([chunk]).serialize(),
    );

    return this;
  }

  storeAll(limit: u32 = limitChunk): FileBuilder {
    let chunks: ChunkPost[] = [];

    // prepare list of chunks
    for (let i = 0; i < this.files.length; i++) {
      const fileInfo = this.files[i];
      for (let j = 0; j < fileInfo.data.length; j++) {
        chunks.push(new ChunkPost(fileInfo.fileName, j, fileInfo.data[j]));
      }
    }

    // Prepare list of list of chunks to store based on limit, one list should not exceed limit
    let chunkList: ChunkPost[][] = [];
    let currentChunkList: ChunkPost[] = [];
    let currentChunkSize = 0;
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (u32(currentChunkSize + chunk.data.length) > limit) {
        chunkList.push(currentChunkList);
        currentChunkList = [];
        currentChunkSize = 0;
      }
      currentChunkList.push(chunk);
      currentChunkSize += chunk.data.length;
    }

    if (currentChunkList.length > 0) {
      chunkList.push(currentChunkList);
    }

    // Store list of list of chunks
    for (let i = 0; i < chunkList.length; i++) {
      storeFileChunks(
        new Args()
          .addSerializableObjectArray<ChunkPost>(chunkList[i])
          .serialize(),
      );
    }

    return this;
  }

  setCustomTotalChunks(filename: string, totalChunks: u32): FileBuilder {
    let fileInfo: FileInfo | null = null;
    for (let i = 0; i < this.files.length; i++) {
      if (this.files[i].fileName == filename) {
        fileInfo = this.files[i];
        fileInfo.nbChunks = totalChunks;
        break;
      }
    }

    if (fileInfo == null) {
      throw new Error(
        `File ${filename} not initialized. Use withFile() first.`,
      );
    }

    return this;
  }

  hasFiles(): void {
    const fileList = new Args(getFilePathList()).next<string[]>().unwrap();
    for (let i = 0; i < this.files.length; i++) {
      const fileInfo = this.files[i];
      assert(
        fileList.includes(fileInfo.fileName),
        `File ${fileInfo.fileName} should be in the file list`,
      );
      for (let j = 0; j < fileInfo.data.length; j++) {
        const storedChunk = getChunk(
          new ChunkGet(fileInfo.fileNameHash, j).serialize(),
        );
        assert(
          storedChunk.length == fileInfo.data[j].length,
          `Chunk ${j} of ${fileInfo.fileName} should have correct length`,
        );
      }
    }
  }

  fetchLastProjectUpdate(): void {
    const lastUpdateBytes = getProjectLastUpdate();
    this.lastProjectUpdate = bytesToU64(lastUpdateBytes);
  }
}

export function given(): FileBuilder {
  return new FileBuilder();
}

export function checkThat(fileBuilder: FileBuilder): FileBuilder {
  return fileBuilder;
}
