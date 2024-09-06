import { divideIntoChunks } from '../src/lib/website/chunk'

describe('divideIntoChunks', () => {
  const tests = [
    { name: 'Empty byte array', data: new Uint8Array(), chunkSize: 2 },
    {
      name: 'Nil chunkSize',
      data: new Uint8Array(Buffer.from('Hello')),
      chunkSize: 0,
    },
    {
      name: 'Nominal test case',
      data: new Uint8Array(Buffer.from('Hello, World!')),
      chunkSize: 1,
    },
    {
      name: 'Median',
      data: new Uint8Array(Buffer.from('Hello, World!')),
      chunkSize: 4,
    },
    {
      name: 'Big byte array',
      data: new Uint8Array(
        Buffer.from('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
      ),
      chunkSize: 16,
    },
    {
      name: 'Small byte array',
      data: new Uint8Array(Buffer.from('hello')),
      chunkSize: 32,
    },
    {
      name: 'Single character',
      data: new Uint8Array(Buffer.from('a')),
      chunkSize: 2,
    },
    {
      name: 'Exact divisible length',
      data: new Uint8Array(Buffer.from('123456')),
      chunkSize: 2,
    },
    {
      name: 'Long sentence',
      data: new Uint8Array(
        Buffer.from(
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ' +
            'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.'
        )
      ),
      chunkSize: 3,
    },
  ]

  tests.forEach((test) => {
    it(test.name, () => {
      const chunks = divideIntoChunks(test.data, test.chunkSize)

      if (test.data.length === 0 || test.chunkSize <= 0) {
        expect(chunks).toEqual([])
        return
      }

      const expectedLen = Math.ceil(test.data.length / test.chunkSize)
      expect(chunks.length).toBe(expectedLen)

      const expectedLastChunkLen =
        test.data.length % test.chunkSize || test.chunkSize

      // Assert the length of each chunk except the last one
      for (let i = 0; i < chunks.length - 1; i++) {
        expect(chunks[i].length).toBe(test.chunkSize)
      }

      // Assert the length of the last chunk
      if (chunks.length > 0) {
        const lastChunk = chunks[chunks.length - 1]
        expect(lastChunk.length).toBe(expectedLastChunkLen)
      }
    })
  })
})
