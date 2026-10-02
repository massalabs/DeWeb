import { Command } from '@commander-js/extra-typings'
import { OptionValues } from 'commander'

import {
  addProgramOptions,
  addSharedOptions,
  commandOptions,
} from '../src/commands/options'

/**
 * Parses argv with a program built like the CLI one, around an `upload`-like command, and returns
 * the website path and the merged options the command sees.
 */
function parse(argv: string[]): { path: string; options: OptionValues } {
  let result: { path: string; options: OptionValues } | undefined

  const program = addProgramOptions(new Command().exitOverride())
  const upload = new Command('upload')
    .exitOverride()
    .argument('<website_path>')
    .option('-a, --address <address>')
    .option('-y, --yes', '', false)
    .action((path, _, command) => {
      result = { path, options: commandOptions(command) }
    })
  program.addCommand(addSharedOptions(upload))

  program.parse(argv, { from: 'user' })
  if (!result) throw new Error('command not run')
  return result
}

describe('command options', () => {
  it('gives -a after the command to the command', () => {
    const { path, options } = parse(['upload', 'dist', '-a', 'AS1xyz', '-y'])

    expect(path).toBe('dist')
    expect(options.address).toBe('AS1xyz')
    expect(options.accept_disclaimer).toBeUndefined()
  })

  it('gives -a before the command to the disclaimer', () => {
    const { options } = parse(['-a', 'upload', 'dist'])

    expect(options.accept_disclaimer).toBe(true)
    expect(options.address).toBeUndefined()
  })

  it('accepts the shared options after the command (deweb-gh-action usage)', () => {
    const { path, options } = parse([
      '-a',
      'upload',
      '-c',
      'my.json',
      '-y',
      '--node_url',
      'http://node',
      'dist',
    ])

    expect(path).toBe('dist')
    expect(options).toMatchObject({
      accept_disclaimer: true,
      config: 'my.json',
      node_url: 'http://node',
      yes: true,
    })
  })

  it('keeps a shared option given before the command', () => {
    expect(parse(['-c', 'my.json', 'upload', 'dist']).options.config).toBe(
      'my.json'
    )
  })

  it('lets a shared option given after the command override the default', () => {
    expect(parse(['upload', 'dist', '-c', 'my.json']).options.config).toBe(
      'my.json'
    )
  })

  it('uses the default config file when none is given', () => {
    expect(parse(['upload', 'dist']).options.config).toBe(
      'deweb_cli_config.json'
    )
  })

  it('accepts the long disclaimer flag after the command', () => {
    expect(
      parse(['upload', 'dist', '--accept_disclaimer']).options.accept_disclaimer
    ).toBe(true)
  })

  it('rejects an extra argument instead of ignoring it', () => {
    expect(() => parse(['upload', 'dist', 'AS1xyz'])).toThrow(
      /too many arguments/
    )
  })
})
