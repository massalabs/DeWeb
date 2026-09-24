import {
  filesInitCost,
  prepareCost,
  totalPreparationCost,
  PreparationCost,
} from '../src/lib/website/filesInit'
import { FileDelete } from '../src/lib/website/models/FileDelete'
import { FileInit } from '../src/lib/website/models/FileInit'
import { Metadata } from '../src/lib/website/models/Metadata'

const noCost: PreparationCost = {
  filePathListCost: 0n,
  storageCost: 0n,
  filesToDeleteCost: 0n,
  metadatasCost: 0n,
  metadatasToDeleteCost: 0n,
}

describe('prepareCost', () => {
  it('should report freed storage as a positive magnitude', async () => {
    const cost = await prepareCost(
      [],
      [new FileDelete('index.html'), new FileDelete('style.css')],
      [],
      [new Metadata('TITLE', 'my website')]
    )

    expect(cost.filesToDeleteCost).toBeGreaterThan(0n)
    expect(cost.metadatasToDeleteCost).toBeGreaterThan(0n)
  })

  it('should report allocated storage as a positive magnitude', async () => {
    const cost = await prepareCost(
      [new FileInit('index.html')],
      [],
      [new Metadata('TITLE', 'my website')],
      []
    )

    expect(cost.filePathListCost).toBeGreaterThan(0n)
    expect(cost.storageCost).toBeGreaterThan(0n)
    expect(cost.metadatasCost).toBeGreaterThan(0n)
  })

  it('should scale the freed storage with the number of deletions', async () => {
    const one = await prepareCost([], [new FileDelete('a.html')], [], [])
    const two = await prepareCost(
      [],
      [new FileDelete('a.html'), new FileDelete('b.html')],
      [],
      []
    )

    expect(two.filesToDeleteCost).toBe(one.filesToDeleteCost * 2n)
  })
})

describe('totalPreparationCost', () => {
  it('should add the allocated storage', () => {
    expect(
      totalPreparationCost({
        ...noCost,
        filePathListCost: 10n,
        storageCost: 20n,
        metadatasCost: 30n,
      })
    ).toBe(60n)
  })

  it('should subtract the freed storage', () => {
    expect(
      totalPreparationCost({
        ...noCost,
        filePathListCost: 100n,
        filesToDeleteCost: 30n,
        metadatasToDeleteCost: 20n,
      })
    ).toBe(50n)
  })

  // Regression: freed storage used to be accumulated as a negative value and
  // then subtracted again, so deletions inflated the coins sent instead of
  // reducing them.
  it('should never make a deletion increase the total', () => {
    const deleteOnly = totalPreparationCost({
      ...noCost,
      filesToDeleteCost: 42n,
      metadatasToDeleteCost: 8n,
    })

    expect(deleteOnly).toBe(-50n)
    expect(deleteOnly).toBeLessThan(0n)
  })

  it('should be zero when there is nothing to do', () => {
    expect(totalPreparationCost(noCost)).toBe(0n)
  })
})

describe('filesInitCost', () => {
  it('should be lower when the same call also deletes files', async () => {
    const files = [new FileInit('index.html')]

    const withoutDelete = await filesInitCost(files, [], [], [])
    const withDelete = await filesInitCost(
      files,
      [new FileDelete('old.html')],
      [],
      []
    )

    expect(withDelete).toBeLessThan(withoutDelete)
  })

  it('should be negative for a delete-only call', async () => {
    const cost = await filesInitCost([], [new FileDelete('old.html')], [], [])

    expect(cost).toBeLessThan(0n)
  })
})
