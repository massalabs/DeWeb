import { Args, stringToBytes } from '@massalabs/as-types';
import { getKeys, sha256 } from '@massalabs/massa-as-sdk';
import {
  filesInit,
  uploadFileChunks,
} from '../../../contracts/deweb-interface';
import { FileChunkGet } from '../../../contracts/serializable/FileChunkGet';
import { FileChunkPost } from '../../../contracts/serializable/FileChunkPost';
import { FILE_LOCATION_TAG } from '../../../contracts/internals/storageKeys/tags';
import { Metadata } from '../../../contracts/serializable/Metadata';
import { FileInit } from '../../../contracts/serializable/FileInit';
import { _assertGlobalMetadata, _assertFileMetadata } from './file-metadata';
import { FileDelete } from '../../../contracts/serializable/FileDelete';
import {
  _assertFileChunkCountIsCorrect,
  _assertFileChunksAreCorrect,
  _assertRightNbOfFilesLocations,
} from './upload-file';

const CHUNK_SIZE_LIMIT = 10240;

class FileInfo {
  locationHash: StaticArray<u8>;

  constructor(
    public location: string,
    public nbChunks: u32,
    public data: StaticArray<u8>[] = [],
    public metadata: Metadata[] = [],
  ) {
    this.locationHash = sha256(stringToBytes(location));
  }
}

export class Uploader {
  private files: FileInfo[];
  private filesToDelete: FileDelete[] = [];
  private globalMetadata: Metadata[] = [];
  private globalMetadataToDelete: Metadata[] = [];

  constructor() {
    this.files = [];
  }

  withFile(
    location: string,
    data: StaticArray<u8>[] = [],
    metadata: Metadata[] = [],
    nbChunks: u32 = data.length,
  ): Uploader {
    this.files.push(new FileInfo(location, nbChunks, data, metadata));
    return this;
  }

  withGlobalMetadata(key: string, value: string): Uploader {
    this.globalMetadata.push(new Metadata(key, value));
    return this;
  }

  withGlobalMetadataToDelete(key: string): Uploader {
    this.globalMetadataToDelete.push(new Metadata(key, ''));
    return this;
  }

  withFilesToDelete(locations: string[]): Uploader {
    for (let i = 0; i < locations.length; i++) {
      this.filesToDelete.push(
        new FileDelete(sha256(stringToBytes(locations[i]))),
      );
    }

    return this;
  }

  public init(): Uploader {
    const initFiles: FileInit[] = [];
    for (let i = 0; i < this.files.length; i++) {
      initFiles.push(
        new FileInit(
          this.files[i].location,
          this.files[i].nbChunks,
          this.files[i].metadata,
        ),
      );
    }

    filesInit(
      new Args()
        .addSerializableObjectArray<FileInit>(initFiles)
        .addSerializableObjectArray<FileDelete>(this.filesToDelete)
        .addSerializableObjectArray<Metadata>(this.globalMetadata)
        .addSerializableObjectArray<Metadata>(this.globalMetadataToDelete)
        .serialize(),
    );

    return this;
  }

  uploadAll(limit: u32 = CHUNK_SIZE_LIMIT): this {
    const chunks = this.prepareChunksPost();
    const chunkBatches = this.groupChunks(chunks, limit);
    this.uploadChunkBatches(chunkBatches);
    return this;
  }

  private prepareChunksPost(): FileChunkPost[] {
    const chunks: FileChunkPost[] = [];
    for (let i = 0; i < this.files.length; i++) {
      const fileInfo = this.files[i];
      for (let j = 0; j < fileInfo.data.length; j++) {
        chunks.push(new FileChunkPost(fileInfo.location, j, fileInfo.data[j]));
      }
    }
    return chunks;
  }

  private groupChunks(chunks: FileChunkPost[], limit: u32): FileChunkPost[][] {
    const batches: FileChunkPost[][] = [];
    let currentGroup: FileChunkPost[] = [];
    let currentSize: u32 = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (currentSize + chunk.data.length > limit && currentGroup.length > 0) {
        batches.push(currentGroup);
        currentGroup = [];
        currentSize = 0;
      }
      currentGroup.push(chunk);
      currentSize += chunk.data.length;
    }

    if (currentGroup.length > 0) {
      batches.push(currentGroup);
    }

    return batches;
  }

  private uploadChunkBatches(chunkBatches: FileChunkPost[][]): void {
    for (let i = 0; i < chunkBatches.length; i++) {
      uploadFileChunks(
        new Args()
          .addSerializableObjectArray<FileChunkPost>(chunkBatches[i])
          .serialize(),
      );
    }
  }

  hasUploadedFiles(): Uploader {
    _assertRightNbOfFilesLocations(this.files.length);

    for (let i = 0; i < this.files.length; i++) {
      _assertFileChunksAreCorrect(
        this.files[i].location,
        this.files[i].data,
        this.files[i].nbChunks,
      );
    }

    return this;
  }

  hasGlobalMetadata(): Uploader {
    for (let i = 0; i < this.globalMetadata.length; i++) {
      _assertGlobalMetadata([this.globalMetadata[i].key]);
    }

    return this;
  }

  hasFileMetadata(): Uploader {
    for (let i = 0; i < this.files.length; i++) {
      _assertFileMetadata(this.files[i].locationHash, this.files[i].metadata);
    }
    return this;
  }

  hasTheRightNumberOfFilesLocations(): Uploader {
    const dataStoreEntriesLocation = getKeys(FILE_LOCATION_TAG);

    assert(
      dataStoreEntriesLocation.length == this.files.length,
      'File count should be correct',
    );

    return this;
  }

  hasTheRightChunkCount(): Uploader {
    for (let i = 0; i < this.files.length; i++) {
      _assertFileChunkCountIsCorrect(
        this.files[i].location,
        this.files[i].nbChunks,
      );
    }
    return this;
  }
}

export function uploader(): Uploader {
  return new Uploader();
}

export function ensure(fileBuilder: Uploader): Uploader {
  return fileBuilder;
}

export function chunkGetArgs(
  hashLocation: StaticArray<u8>,
  index: u32,
): StaticArray<u8> {
  return new FileChunkGet(hashLocation, index).serialize();
}
