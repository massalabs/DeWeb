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
  deleteFiles,
  getFileLocations,
} from '../../contracts/deweb-interface';

import { FileChunkGet } from '../../contracts/serializable/FileChunkGet';
import { FileChunkPost } from '../../contracts/serializable/FileChunkPost';
import { fileChunkCountKey } from '../../contracts/internals/storageKeys/chunksKeys';
import { fileMetadataKey } from '../../contracts/internals/storageKeys/metadataKeys';
import {
  FILE_METADATA_LOCATION_TAG,
  FILE_METADATA_TAG,
  GLOBAL_METADATA_TAG,
} from '../../contracts/internals/storageKeys/tags';
import { Metadata } from '../../contracts/serializable/Metadata';
import { _getGlobalMetadata } from '../../contracts/internals/metadata';
import { FileInit } from '../../contracts/serializable/FileInit';
import { FileDelete } from '../../contracts/serializable/FileDelete';
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

class FileBuilder {
  private files: FileInfo[];
  private filesToDelete: FileInit[] = [];
  private globalMetadata: Metadata[] = [];

  constructor() {
    this.files = [];
  }

  withFile(
    location: string,
    nbChunks: u32,
    data: StaticArray<u8>[] = [],
    metadata: Metadata[] = [],
  ): FileBuilder {
    this.files.push(new FileInfo(location, nbChunks, data, metadata));
    return this;
  }

  withGlobalMetadata(key: string, value: string): FileBuilder {
    this.globalMetadata.push(
      new Metadata(stringToBytes(key), stringToBytes(value)),
    );
    return this;
  }

  withFilesToDelete(locations: string[]): FileBuilder {
    for (let i = 0; i < locations.length; i++) {
      const file = new FileInit(
        locations[i],
        sha256(stringToBytes(locations[i])),
      );
      this.filesToDelete.push(file);
    }

    return this;
  }

  public init(): FileBuilder {
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

  uploadAll(limit: u32 = limitChunk): FileBuilder {
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

  deleteFiles(files: FileDelete[]): void {
    deleteFiles(
      new Args().addSerializableObjectArray<FileDelete>(files).serialize(),
    );
  }

  // deleteWebsite(): void {
  //   deleteWebsite(new Args().serialize());
  // }

  hasUploadedFiles(): FileBuilder {
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

  hasGlobalMetadata(): FileBuilder {
    const dataStoreEntriesMetadata = getKeys(GLOBAL_METADATA_TAG);

    for (let i = 0; i < dataStoreEntriesMetadata.length; i++) {
      assert(
        dataStoreEntriesMetadata[i].toString() ==
          GLOBAL_METADATA_TAG.concat(this.globalMetadata[i].key).toString(),
        'Metadata key should be correct',
      );

      const value = _getGlobalMetadata(this.globalMetadata[i].key);
      assert(
        value.toString() == this.globalMetadata[i].value.toString(),
        'Metadata value should be correct',
      );
    }
    return this;
  }

  hasMetadata(): FileBuilder {
    for (let i = 0; i < this.files.length; i++) {
      const fileInfo = this.files[i];
      for (let j = 0; j < fileInfo.metadata.length; j++) {
        const storageKey = fileMetadataKey(
          fileInfo.locationHash,
          fileInfo.metadata[j].key,
        );
        assert(Storage.has(storageKey), 'Metadata should be stored');
        assert(
          Storage.get(storageKey).toString() ==
            fileInfo.metadata[j].value.toString(),
          'Metadata value should be correct',
        );
      }
    }
    return this;
  }

  hasTheRightNumberOfFiles(): FileBuilder {
    const dataStoreEntriesLocation = getKeys(
      FILE_METADATA_TAG.concat(FILE_METADATA_LOCATION_TAG),
    );

    assert(
      dataStoreEntriesLocation.length == this.files.length,
      'File count should be correct',
    );

    return this;
  }

  hasTheRightNumberOfChunks(): FileBuilder {
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

  hasNoFiles(): void {
    const fileList = new Args(getFileLocations()).next<string[]>().unwrap();
    assert(fileList.length === 0, 'FileList should be empty');
  }

  fileIsDeleted(location: string): void {
    const fileList = new Args(getFileLocations()).next<string[]>().unwrap();
    for (let i = 0; i < fileList.length; i++) {
      assert(
        !fileList.includes(location),
        `File ${location} should not be in the file list`,
      );
    }
  }
}

export function given(): FileBuilder {
  return new FileBuilder();
}

export function checkThat(fileBuilder: FileBuilder): FileBuilder {
  return fileBuilder;
}

export function chunkGetArgs(
  hashLocation: StaticArray<u8>,
  index: u32,
): StaticArray<u8> {
  return new FileChunkGet(hashLocation, index).serialize();
}
