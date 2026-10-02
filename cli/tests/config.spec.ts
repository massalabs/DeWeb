import { Command } from '@commander-js/extra-typings'
import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'

import {
  DEFAULT_CHUNK_SIZE,
  loadConfig,
  parseChunkSize,
} from '../src/commands/config'
import {
  addProgramOptions,
  addSharedOptions,
  commandOptions,
} from '../src/commands/options'
import { Metadata } from '../src/lib/website/models/Metadata'

const WEBSITE = 'AS12hhqC4BTZJxP7syZx4QuhPovtFyYWmR5nPdZbVAtunCAkw8aZq'
const OTHER_WEBSITE = 'AS1hCJXjndR4c9vekLWsXGnrdigp4AaZ7uYG3UKFzzKnWVsrNLPJ'

let dir: string

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'deweb-cli-config-'))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

function writeConfig(content: object): string {
  const file = path.join(dir, 'deweb_cli_config.json')
  writeFileSync(file, JSON.stringify(content))
  return file
}

/**
 * Parses argv with the CLI option helpers around an `upload`-like command, and loads the config the
 * way the commands do.
 */
function load(argv: string[]): ReturnType<typeof loadConfig> {
  let config: ReturnType<typeof loadConfig> | undefined

  const program = addProgramOptions(new Command().exitOverride())
  const upload = new Command('upload')
    .exitOverride()
    .argument('<website_path>')
    .option('-a, --address <address>')
    .option('-s, --chunkSize <size>')
    .option('-y, --yes', '', false)
    .action((_, __, command) => {
      config = loadConfig(commandOptions(command))
    })
  program.addCommand(addSharedOptions(upload))

  program.parse(argv, { from: 'user' })
  if (!config) throw new Error('command not run')
  return config
}

describe('JSON config file', () => {
  it('is read with the deweb-gh-action command line', () => {
    const file = writeConfig({
      address: WEBSITE,
      node_url: 'https://buildnet.massa.net/api/v2',
      metadatas: { TITLE: 'my site', DESCRIPTION: 'a site' },
    })

    const config = load(['-a', 'upload', '-c', file, '-y', 'dist'])

    expect(config.address).toBe(WEBSITE)
    expect(config.node_url).toBe('https://buildnet.massa.net/api/v2')
    expect(config.chunk_size).toBe(DEFAULT_CHUNK_SIZE)
    expect(config.metadatas).toEqual([
      new Metadata('TITLE', 'my site'),
      new Metadata('DESCRIPTION', 'a site'),
    ])
  })

  it('lets --node_url override the config file, as the action rpc_url input does', () => {
    const file = writeConfig({ node_url: 'https://buildnet.massa.net/api/v2' })

    const config = load([
      '-a',
      'upload',
      '-c',
      file,
      '-y',
      '--node_url',
      'https://mainnet.massa.net/api/v2',
      'dist',
    ])

    expect(config.node_url).toBe('https://mainnet.massa.net/api/v2')
  })

  it('reads the config file given before the command name', () => {
    const file = writeConfig({ address: WEBSITE })

    expect(load(['-c', file, 'upload', 'dist']).address).toBe(WEBSITE)
  })

  it('lets --address override the config address', () => {
    const file = writeConfig({ address: WEBSITE })

    expect(
      load(['upload', '-c', file, 'dist', '-a', OTHER_WEBSITE]).address
    ).toBe(OTHER_WEBSITE)
  })

  it('keeps the config address when the command leaves it unset', () => {
    const file = writeConfig({ address: WEBSITE })

    // `list` and `metadata` pass their optional address argument, undefined when omitted
    expect(loadConfig({ config: file, address: undefined }).address).toBe(
      WEBSITE
    )
  })

  it('reads secret_key and chunk_size', () => {
    const file = writeConfig({ secret_key: 'S1secret', chunk_size: 32000 })

    const config = load(['upload', '-c', file, 'dist'])

    expect(config.secret_key).toBe('S1secret')
    expect(config.chunk_size).toBe(32000)
  })

  it('reads the wallet credentials from wallet_path and wallet_password', () => {
    const file = writeConfig({
      wallet_path: 'wallet.yaml',
      wallet_password: 'pass',
    })

    const config = load(['upload', '-c', file, 'dist'])

    expect(config.wallet).toBe('wallet.yaml')
    expect(config.password).toBe('pass')
  })

  it('lets --wallet and --password override the config wallet', () => {
    const file = writeConfig({
      wallet_path: 'wallet.yaml',
      wallet_password: 'pass',
    })

    const config = load([
      'upload',
      '-c',
      file,
      '-w',
      'other.yaml',
      '-p',
      'other',
      'dist',
    ])

    expect(config.wallet).toBe('other.yaml')
    expect(config.password).toBe('other')
  })

  it('rejects an invalid address in the config file', () => {
    const file = writeConfig({ address: 'not-an-address' })

    expect(() => load(['upload', '-c', file, 'dist'])).toThrow()
  })

  it('fails when an explicitly given config file does not exist', () => {
    expect(() =>
      load(['upload', '-c', path.join(dir, 'missing.json'), 'dist'])
    ).toThrow(/Config file not found/)
  })
})

describe('parseChunkSize', () => {
  it('accepts a positive integer', () => {
    expect(parseChunkSize('32000')).toBe(32000)
  })

  it.each(['0', '-1', '1.5', 'abc', ''])('rejects %p', (value) => {
    expect(() => parseChunkSize(value)).toThrow(/Invalid chunk size/)
  })
})
