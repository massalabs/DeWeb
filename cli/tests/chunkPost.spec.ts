import { ChunkPost, toChunkPosts } from '../src/lib/website/chunkPost'

describe('ChunkPost', () => {
  it('should serialize and deserialize correctly', () => {
    const filePath = 'test.txt'
    const chunkId = 1n
    const data = new Uint8Array([1, 2, 3, 4])

    const chunkPost = new ChunkPost(filePath, chunkId, data)
    const serialized = chunkPost.serialize()
    const deserializedResult = new ChunkPost().deserialize(serialized, 0)
    const deserialized = deserializedResult.instance

    expect(deserialized.filePath).toBe(filePath)
    expect(deserialized.chunkId).toBe(chunkId)
    expect(deserialized.data).toEqual(data)
  })
})

describe('toChunkPosts', () => {
  it('should convert chunks to ChunkPost instances', () => {
    const filePath = 'test.txt'
    const chunks = [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5, 6])]
    const chunkPosts = toChunkPosts(filePath, chunks)

    expect(chunkPosts).toHaveLength(2)
    expect(chunkPosts[0].filePath).toBe(filePath)
    expect(chunkPosts[0].chunkId).toBe(0n)
    expect(chunkPosts[0].data).toEqual(chunks[0])

    expect(chunkPosts[1].filePath).toBe(filePath)
    expect(chunkPosts[1].chunkId).toBe(1n)
    expect(chunkPosts[1].data).toEqual(chunks[1])
  })
})
