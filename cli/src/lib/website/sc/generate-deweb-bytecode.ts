import path from 'path'
import fs from 'fs'

const CONTRACT_SOURCE = path.join(
  __dirname,
  '../../../../../smart-contract/assembly/contracts/deweb-interface.ts'
)

/**
 * Reads the version the contract stores in its datastore (`DEWEB_VERSION`), so that the CLI knows which
 * version its bytecode is and can tell when a website runs an older one.
 */
function readContractVersion(src: string): string {
  const match = fs
    .readFileSync(src, 'utf8')
    .match(/const DEWEB_VERSION = '(\d+)'/)
  if (!match) {
    throw new Error(`DEWEB_VERSION not found in ${src}`)
  }
  return match[1]
}

console.log('Generating deweb contract bytecode...')
function generateBytecode(src?: string, dst?: string): void {
  const wasmPath = src ?? path.join(__dirname, 'main.wasm')
  const wasmData = fs.readFileSync(wasmPath)
  const version = readContractVersion(CONTRACT_SOURCE)

  const output = `
  /* eslint-disable max-len */
  export const DEWEB_SC_BYTECODE: Uint8Array = new Uint8Array([${[...wasmData]}]);\n
  /** Version of DEWEB_SC_BYTECODE, as stored by the contract under DEWEB_VERSION_TAG */
  export const DEWEB_SC_VERSION = '${version}';\n
  `

  const outputDir = dst ?? path.join(__dirname, './deweb-sc-bytecode.ts')

  fs.writeFileSync(outputDir, output)
}

generateBytecode()
