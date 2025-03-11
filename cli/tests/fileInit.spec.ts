import { describe, it, expect } from '@jest/globals'
import { createBatches, batchSize } from '../src/lib/website/filesInit'
import { FileInit } from '../src/lib/website/models/FileInit'
import { FileDelete } from '../src/lib/website/models/FileDelete'
import { Metadata } from '../src/lib/website/models/Metadata'

describe('createBatches', () => {
  it('should create batches with the correct number of elements', () => {
    const files = Array.from({ length: batchSize * 2 + 1 }, (_, i) => new FileInit(`file${i}`))
    const filesToDelete = Array.from({ length: batchSize * 2 - 1 }, (_, i) => new FileDelete(`hash${i}`))
    const metadatas = Array.from({ length: batchSize }, (_, i) => new Metadata(`key${i}`, `value${i}`))
    const metadatasToDelete = Array.from({ length: 2 }, (_, i) => new Metadata(`key${i}`, `value${i}`))

    const batches = createBatches(files, filesToDelete, metadatas, metadatasToDelete)

    expect(batches).toHaveLength(3)
    expect(batches[0].fileInits).toHaveLength(batchSize)
    expect(batches[1].fileInits).toHaveLength(batchSize)
    expect(batches[2].fileInits).toHaveLength(1)
    expect(batches[0].fileDeletes).toHaveLength(batchSize)
    expect(batches[1].fileDeletes).toHaveLength(batchSize - 1)
    expect(batches[2].fileDeletes).toHaveLength(0)
    expect(batches[0].metadatas).toHaveLength(batchSize)
    expect(batches[1].metadatas).toHaveLength(0)
    expect(batches[0].metadataDeletes).toHaveLength(2)
  })

  it('should handle empty inputs', () => {
    const files: FileInit[] = []
    const filesToDelete: FileDelete[] = []
    const metadatas: Metadata[] = []
    const metadatasToDelete: Metadata[] = []

    const batches = createBatches(files, filesToDelete, metadatas, metadatasToDelete)

    expect(batches).toHaveLength(0)
  })

  it('should handle inputs with same lengths', () => {
    const files = Array.from({ length: 2 }, (_, i) => new FileInit(`file${i}`))
    const filesToDelete = Array.from({ length: 2 }, (_, i) => new FileDelete(`hash${i}`))
    const metadatas = Array.from({ length: 2 }, (_, i) => new Metadata())
    const metadatasToDelete = Array.from({ length: 2 }, (_, i) => new Metadata(`key${i}`))

    const batches = createBatches(files, filesToDelete, metadatas, metadatasToDelete)

    expect(batches).toHaveLength(1)
    expect(batches[0].fileInits).toHaveLength(2)
    expect(batches[0].fileDeletes).toHaveLength(2)
    expect(batches[0].metadatas).toHaveLength(2)
    expect(batches[0].metadataDeletes).toHaveLength(2)
  })
})