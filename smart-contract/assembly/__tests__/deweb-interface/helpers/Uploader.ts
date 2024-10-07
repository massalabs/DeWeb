import {
  Args,
  bytesToString,
  bytesToU32,
  stringToBytes,
} from '@massalabs/as-types';
import { getKeys, sha256, Storage } from '@massalabs/massa-as-sdk';
import {
  filesInit,
  uploadFileChunks,
  getFileChunk,
} from '../../../contracts/deweb-interface';
import { FileChunkGet } from '../../../contracts/serializable/FileChunkGet';
import { FileChunkPost } from '../../../contracts/serializable/FileChunkPost';
import { fileChunkCountKey } from '../../../contracts/internals/storageKeys/chunksKeys';
import {
  FILE_METADATA_LOCATION_TAG,
  FILE_METADATA_TAG,
  GLOBAL_METADATA_TAG,
} from '../../../contracts/internals/storageKeys/tags';
import { Metadata } from '../../../contracts/serializable/Metadata';
import { _getGlobalMetadata } from '../../../contracts/internals/metadata';
import { FileInit } from '../../../contracts/serializable/FileInit';
import { _assertMetadataAddedToFile } from './file-metadata';
const limitChunk = 10240;

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
  private filesToDelete: FileInit[] = [];
  private globalMetadata: Metadata[] = [];

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

  withFilesToDelete(locations: string[]): Uploader {
    for (let i = 0; i < locations.length; i++) {
      const file = new FileInit(
        locations[i],
        sha256(stringToBytes(locations[i])),
      );
      this.filesToDelete.push(file);
    }

    return this;
  }

  public init(): Uploader {
    const initFiles: FileInit[] = [];
    for (let i = 0; i < this.files.length; i++) {
      const fileInfo = this.files[i];

      initFiles.push(
        new FileInit(
          fileInfo.location,
          fileInfo.locationHash,
          fileInfo.nbChunks,
          fileInfo.metadata,
        ),
      );
    }

    filesInit(
      new Args()
        .addSerializableObjectArray<FileInit>(initFiles)
        .addSerializableObjectArray<FileInit>(this.filesToDelete)
        .addSerializableObjectArray<Metadata>(this.globalMetadata)
        .serialize(),
    );

    return this;
  }

  uploadAll(limit: u32 = limitChunk): Uploader {
    let chunks: FileChunkPost[] = [];

    // prepare list of chunks
    for (let i = 0; i < this.files.length; i++) {
      const fileInfo = this.files[i];
      for (let j = 0; j < fileInfo.data.length; j++) {
        chunks.push(new FileChunkPost(fileInfo.location, j, fileInfo.data[j]));
      }
    }

    // Prepare list of list of chunks to store based on limit, one list should not exceed limit
    let chunkList: FileChunkPost[][] = [];
    let currentChunkList: FileChunkPost[] = [];
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
      uploadFileChunks(
        new Args()
          .addSerializableObjectArray<FileChunkPost>(chunkList[i])
          .serialize(),
      );
    }

    return this;
  }

  hasUploadedFiles(): Uploader {
    const dataStoreEntriesLocation = getKeys(
      FILE_METADATA_TAG.concat(FILE_METADATA_LOCATION_TAG),
    );
    // Check the list of file locations are correct
    assert(
      dataStoreEntriesLocation.length == this.files.length,
      'File count should be correct',
    );

    for (let i = 0; i < dataStoreEntriesLocation.length; i++) {
      const location = bytesToString(Storage.get(dataStoreEntriesLocation[i]));
      // TODO: Improve this check as might not be in same order ?
      assert(
        this.files[i].location == location,
        `File ${location} should be in the file list`,
      );
    }

    // Check the chunks are correct
    for (let i = 0; i < this.files.length; i++) {
      const fileInfo = this.files[i];
      for (let j = u32(0); j < fileInfo.nbChunks; j++) {
        const storedChunk = getFileChunk(
          chunkGetArgs(fileInfo.locationHash, j),
        );
        assert(
          storedChunk.toString() == fileInfo.data[j].toString(),
          `Chunk ${j} of ${fileInfo.location} should be correct`,
        );
      }
    }
    return this;
  }

  hasGlobalMetadata(): Uploader {
    const dataStoreEntriesMetadata = getKeys(GLOBAL_METADATA_TAG);

    for (let i = 0; i < dataStoreEntriesMetadata.length; i++) {
      assert(
        dataStoreEntriesMetadata[i].toString() ==
          GLOBAL_METADATA_TAG.concat(
            stringToBytes(this.globalMetadata[i].key),
          ).toString(),
        'Metadata key should be correct',
      );

      const value = _getGlobalMetadata(
        stringToBytes(this.globalMetadata[i].key),
      );
      assert(
        bytesToString(value) == this.globalMetadata[i].value,
        'Metadata value should be correct',
      );
    }
    return this;
  }

  hasFileMetadata(): Uploader {
    for (let i = 0; i < this.files.length; i++) {
      const fileInfo = this.files[i];
      _assertMetadataAddedToFile(fileInfo.locationHash, fileInfo.metadata);
    }
    return this;
  }

  hasTheRightNumberOfFilesLocations(): Uploader {
    const dataStoreEntriesLocation = getKeys(
      FILE_METADATA_TAG.concat(FILE_METADATA_LOCATION_TAG),
    );

    assert(
      dataStoreEntriesLocation.length == this.files.length,
      'File count should be correct',
    );

    return this;
  }

  hasTheRightChunkCount(): Uploader {
    for (let i = 0; i < this.files.length; i++) {
      const fileInfo = this.files[i];
      const chunkCountKey = fileChunkCountKey(fileInfo.locationHash);
      assert(
        Storage.has(chunkCountKey),
        'Chunk count should be stored for each file',
      );
      assert(
        bytesToU32(Storage.get(chunkCountKey)) == fileInfo.nbChunks,
        'Chunk count should be correct',
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
