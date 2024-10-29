import path from 'path'
import fs from 'fs'

console.log('Generating deweb contract bytecode...')
function generateBytecode(src?: string, dst?: string): void {
  const wasmPath = src ?? path.join(__dirname, 'main.wasm')
  const wasmData = fs.readFileSync(wasmPath)

  const output = `
  /* eslint-disable max-len */
  export const DEWEB_SC_BYTECODE: Uint8Array = new Uint8Array([${[...wasmData]}]);\n
  `

  const outputDir = dst ?? path.join(__dirname, './deweb-sc-bytecode.ts')

  fs.writeFileSync(outputDir, output)
}

generateBytecode()
