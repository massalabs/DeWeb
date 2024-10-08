import { toChunkPosts } from '../src/lib/website/chunk'
import { FileChunkPost } from '../src/lib/website/models/FileChunkPost'

describe('FileChunkPost', () => {
  it('should serialize and deserialize correctly', () => {
    const location = 'test.txt'
    const index = 1n
    const data = new Uint8Array([1, 2, 3, 4])

    const chunkPost = new FileChunkPost(location, index, data)
    const serialized = chunkPost.serialize()
    const deserializedResult = new FileChunkPost().deserialize(serialized, 0)
    const deserialized = deserializedResult.instance

    expect(deserialized.location).toBe(location)
    expect(deserialized.index).toBe(index)
    expect(deserialized.data).toEqual(data)
  })
})

describe('toFileChunkPosts', () => {
  it('should convert chunks to FileChunkPost instances', () => {
    const location = 'test.txt'
    const chunks = [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5, 6])]
    const chunkPosts = toChunkPosts(location, chunks)

    expect(chunkPosts).toHaveLength(2)
    expect(chunkPosts[0].location).toBe(location)
    expect(chunkPosts[0].index).toBe(0n)
    expect(chunkPosts[0].data).toEqual(chunks[0])

    expect(chunkPosts[1].location).toBe(location)
    expect(chunkPosts[1].index).toBe(1n)
    expect(chunkPosts[1].data).toEqual(chunks[1])
  })
})
