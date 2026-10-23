import {
  Provider,
  SmartContract,
  StorageCost,
  strToBytes,
  U32,
} from '@massalabs/massa-web3'

import { batcher } from '../src/lib/batcher'
import { divideIntoChunks, toChunkPosts } from '../src/lib/website/chunk'
import {
  globalMetadataKey,
  fileChunkCountKey,
  fileChunkKey,
  fileLocationKey,
  fileMetadataKey,
} from '../src/lib/website/storageKeys'
import {
  fileHash,
  globalMetadataStorageDelta,
} from '../src/lib/website/metadata'
import { FileInit } from '../src/lib/website/models/FileInit'
import { Metadata } from '../src/lib/website/models/Metadata'
import { getOnChainFile } from '../src/lib/website/read'
import { costOrRefund, formatAbsMas } from '../src/lib/utils/utils'
import { FileDelete } from '../src/lib/website/models/FileDelete'
import {
  estimateDeleteCost,
  estimateUploadCost,
} from '../src/tasks/estimations'
import { DeleteCtx, UploadCtx } from '../src/tasks/tasks'

const SC_ADDRESS = 'AS12BqZEQ6sByhRLyEuf0YbQmcF2PsDdkNNG1akBJu9XcjZA1eT'
const OWNER = 'AU12UBnqTHDQALpocVBnkPNy7y5CndUJQTLutaVDDFgMJcq5kQiKq'
const FEE = 10_000_000n

type Datastore = [Uint8Array, Uint8Array][]

function hasPrefix(key: Uint8Array, prefix: Uint8Array): boolean {
  return key.length >= prefix.length && prefix.every((b, i) => key[i] === b)
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && hasPrefix(a, b)
}

/** Provider reading from an in-memory SC datastore */
function fakeProvider(datastore: Datastore): Provider {
  return {
    address: OWNER,
    getStorageKeys: async (_: string, prefix: Uint8Array) =>
      datastore.map(([k]) => k).filter((k) => hasPrefix(k, prefix)),
    readStorage: async (_: string, keys: Uint8Array[]) =>
      keys.map(
        (key) => datastore.find(([k]) => sameBytes(k, key))?.[1] ?? null
      ),
    balance: async () => 0n,
  } as unknown as Provider
}

/** Datastore entries of a file as the DeWeb SC stores them */
function storedFile(
  location: string,
  content: Uint8Array,
  chunkSize: number,
  metadata: Metadata[] = []
): Datastore {
  const hash = fileHash(location)
  const chunks = divideIntoChunks(content, chunkSize)
  return [
    [fileLocationKey(hash), strToBytes(location)],
    [fileChunkCountKey(hash), U32.toBytes(BigInt(chunks.length))],
    ...chunks.map(
      (chunk, i) => [fileChunkKey(hash, BigInt(i)), chunk] as const
    ),
    ...metadata.map(
      (m) =>
        [fileMetadataKey(hash, strToBytes(m.key)), strToBytes(m.value)] as const
    ),
  ] as Datastore
}

function storageCost(datastore: Datastore): bigint {
  return datastore.reduce(
    (sum, [k, v]) => sum + StorageCost.datastoreEntry(k, v),
    0n
  )
}

describe('getOnChainFile', () => {
  const content = strToBytes('<html>hello world</html>')
  const file = storedFile('index.html', content, 10, [
    new Metadata('CONTENT_TYPE', 'text/html'),
  ])
  const other = storedFile('style.css', strToBytes('body {}'), 10)

  it('should return the content and the storage of every entry of the file', async () => {
    const onChain = await getOnChainFile(
      fakeProvider([...file, ...other]),
      SC_ADDRESS,
      'index.html'
    )

    expect(onChain?.content).toEqual(content)
    expect(onChain?.storageCost).toBe(storageCost(file))
  })

  it('should return undefined for a file that is not registered', async () => {
    expect(
      await getOnChainFile(fakeProvider(other), SC_ADDRESS, 'index.html')
    ).toBeUndefined()
  })
})

describe('globalMetadataStorageDelta', () => {
  const entry = (key: string, value: string) =>
    StorageCost.datastoreEntry(globalMetadataKey(strToBytes(key)), value)

  it('should charge a whole entry for a new key', () => {
    expect(
      globalMetadataStorageDelta([], [new Metadata('TITLE', 'abc')], [])
    ).toBe(entry('TITLE', 'abc'))
  })

  it('should only charge the value size change of an existing key', () => {
    const onChain = [new Metadata('TITLE', 'abc')]

    expect(
      globalMetadataStorageDelta(onChain, [new Metadata('TITLE', 'abcde')], [])
    ).toBe(StorageCost.bytes(2))
    expect(
      globalMetadataStorageDelta(onChain, [new Metadata('TITLE', 'a')], [])
    ).toBe(-StorageCost.bytes(2))
    expect(
      globalMetadataStorageDelta(onChain, [new Metadata('TITLE', 'xyz')], [])
    ).toBe(0n)
  })

  it('should free the entry of a removed key', () => {
    expect(
      globalMetadataStorageDelta(
        [new Metadata('TITLE', 'abc')],
        [],
        [new Metadata('TITLE')]
      )
    ).toBe(-entry('TITLE', 'abc'))
  })
})

describe('estimateUploadCost', () => {
  const chunkSize = 10

  function uploadCtx(
    files: Record<string, Uint8Array>,
    extra: Partial<UploadCtx> = {}
  ): UploadCtx {
    const chunks = Object.entries(files).flatMap(([location, data]) =>
      toChunkPosts(location, divideIntoChunks(data, chunkSize))
    )
    return {
      provider: fakeProvider([]),
      sc: { address: SC_ADDRESS } as SmartContract,
      noIndex: false,
      skipIndexHtmlCheck: false,
      skipConfirm: true,
      websiteDirPath: '',
      chunks,
      fileInits: Object.entries(files).map(
        ([location, data]) =>
          new FileInit(
            location,
            BigInt(divideIntoChunks(data, chunkSize).length)
          )
      ),
      filesToDelete: [],
      metadatas: [],
      metadatasToDelete: [],
      onChainMetadatas: [],
      freedStorageCost: 0n,
      batches: batcher(chunks, chunkSize),
      chunkSize,
      minimalFees: FEE,
      maxConcurrentOps: 4,
      ...extra,
    }
  }

  it('should only cost the fees to replace a file by one of the same size', async () => {
    const old = storedFile('index.html', strToBytes('<p>hello world</p>'), 10)
    const ctx = uploadCtx(
      { 'index.html': strToBytes('<p>HELLO WORLD</p>') },
      {
        freedStorageCost: storageCost(old),
        onChainMetadatas: [new Metadata('LAST_UPDATE', '1700000000')],
        metadatas: [new Metadata('LAST_UPDATE', '1800000000')],
      }
    )

    const estimation = await estimateUploadCost(ctx)

    // 1 preparation operation, 1 upload batch per chunk of 10 bytes
    expect(estimation.total).toBe(FEE * BigInt(1 + ctx.batches.length))
    // The preparation refunds the old chunks before the new ones are sent
    expect(estimation.requiredBalance).toBe(
      estimation.preparationCoins + FEE > estimation.total
        ? estimation.preparationCoins + FEE
        : estimation.total
    )
  })

  it('should count the full storage of a new website', async () => {
    const data = strToBytes('<p>hello world</p>')
    const ctx = uploadCtx(
      { 'index.html': data },
      {
        sc: undefined,
        metadatas: [new Metadata('LAST_UPDATE', '1800000000')],
      }
    )

    const estimation = await estimateUploadCost(ctx)
    const stored = storedFile('index.html', data, chunkSize)

    expect(estimation.filesInit + estimation.chunks).toBe(storageCost(stored))
    expect(estimation.freed).toBe(0n)
    expect(estimation.deployment).toBeGreaterThan(0n)
    expect(estimation.index).toBeGreaterThan(0n)
    expect(estimation.total).toBe(
      estimation.deployment +
        estimation.index +
        estimation.filesInit +
        estimation.metadatas +
        estimation.chunks +
        estimation.fees
    )
    // deploy + index + preparation + upload operations
    expect(estimation.fees).toBe(FEE * BigInt(1 + 1 + ctx.batches.length))
  })

  it('should refund the storage of deleted files', async () => {
    const deleted = storedFile('old.html', strToBytes('<p>old page</p>'), 10)
    const ctx = uploadCtx(
      {},
      {
        freedStorageCost: storageCost(deleted),
        onChainMetadatas: [new Metadata('LAST_UPDATE', '1700000000')],
        metadatas: [new Metadata('LAST_UPDATE', '1800000000')],
      }
    )

    const estimation = await estimateUploadCost(ctx)

    expect(estimation.total).toBe(FEE - storageCost(deleted))
    // The metadata coins are sent as a whole entry, the excess is refunded
    expect(estimation.requiredBalance).toBe(estimation.preparationCoins + FEE)
  })
})

describe('costOrRefund', () => {
  it('should call a negative amount a refund, with its magnitude', () => {
    expect(costOrRefund(-12_300_000n)).toBe('refund')
    expect(formatAbsMas(-12_300_000n)).toBe('0.0123')
    expect(costOrRefund(12_300_000n)).toBe('cost')
    expect(formatAbsMas(12_300_000n)).toBe('0.0123')
  })
})

describe('estimateDeleteCost', () => {
  const page = storedFile('index.html', strToBytes('<p>hello world</p>'), 10)
  const title: Datastore = [
    [globalMetadataKey(strToBytes('TITLE')), strToBytes('my site')],
  ]
  const owner: Datastore = [[strToBytes('OWNER'), strToBytes(OWNER)]]
  const orphan: Datastore = [
    [fileChunkKey(fileHash('lost.html'), 0n), strToBytes('orphan')],
  ]

  function deleteCtx(purge: boolean, scBalance = 0n): DeleteCtx {
    const provider = {
      ...fakeProvider([...page, ...title, ...owner, ...orphan]),
      balanceOf: async (addresses: string[]) =>
        addresses.map((address) => ({ address, balance: scBalance })),
    } as unknown as Provider
    return {
      provider,
      sc: { address: SC_ADDRESS } as SmartContract,
      purge,
      noIndex: false,
      fileDeletes: [new FileDelete('index.html')],
      globalMetadatas: [new Metadata('TITLE', 'my site')],
      skipConfirm: true,
      minimalFees: FEE,
      scBytecodeSize: 1000,
    }
  }

  it('should refund the storage of the files and metadata', async () => {
    const estimation = await estimateDeleteCost(deleteCtx(false, 5n))

    expect(estimation.files).toBe(storageCost(page))
    expect(estimation.metadatas).toBe(storageCost(title))
    expect(estimation.purge).toBe(0n)
    // 1 filesInit + 1 removeMetadataGlobal operations
    expect(estimation.fees).toBe(2n * FEE)
    expect(estimation.total).toBe(
      2n * FEE - storageCost(page) - storageCost(title) - 5n
    )
  })

  it('should also refund the remaining entries and the bytecode on purge', async () => {
    const estimation = await estimateDeleteCost(deleteCtx(true))

    expect(estimation.purge).toBe(
      storageCost(owner) + storageCost(orphan) + StorageCost.bytes(1000)
    )
    // + purge and index update operations
    expect(estimation.fees).toBe(4n * FEE)
  })
})
