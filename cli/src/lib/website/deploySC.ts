import { Mas, SmartContract, Web3Provider } from '@massalabs/massa-web3'
import { readFileSync } from 'fs'

export async function deploySC(provider: Web3Provider): Promise<SmartContract> {
  const byteCode = readFileSync('src/lib/website/sc/main.wasm')

  return SmartContract.deploy(provider, byteCode, undefined, {
    coins: Mas.fromString('0.01'),
  })
}
