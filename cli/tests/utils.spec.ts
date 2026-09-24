import { chunkArray } from '../src/lib/utils/utils'

describe('chunkArray', () => {
  it('should return no chunk for an empty array', () => {
    expect(chunkArray([], 3)).toEqual([])
  })

  it('should keep a short array in a single chunk', () => {
    expect(chunkArray([1, 2], 3)).toEqual([[1, 2]])
  })

  it('should split evenly when the length is a multiple of the size', () => {
    expect(chunkArray([1, 2, 3, 4], 2)).toEqual([
      [1, 2],
      [3, 4],
    ])
  })

  it('should put the remainder in a shorter last chunk', () => {
    expect(chunkArray([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
  })

  it('should preserve order and every element', () => {
    const items = Array.from({ length: 101 }, (_, i) => i)
    const chunks = chunkArray(items, 10)

    expect(chunks).toHaveLength(11)
    expect(chunks[chunks.length - 1]).toEqual([100])
    expect(chunks.flat()).toEqual(items)
  })

  it('should not mutate the input', () => {
    const items = [1, 2, 3]
    chunkArray(items, 2)

    expect(items).toEqual([1, 2, 3])
  })

  it('should reject a non-positive size', () => {
    expect(() => chunkArray([1, 2], 0)).toThrow()
    expect(() => chunkArray([1, 2], -1)).toThrow()
  })
})
