import { Provider, Operation, PublicAPI } from '@massalabs/massa-web3'

export async function makeImmutable(
  address: string,
  provider: Provider,
  waitFinal = false
): Promise<Operation> {
  const operation = await provider.callSC({
    func: 'upgradeSC',
    target: address,
  })

  await (waitFinal
    ? operation.waitFinalExecution()
    : operation.waitSpeculativeExecution())
  return operation
}

export async function isImmutable(
  address: string,
  node_url: string,
  waitFinal = false
): Promise<boolean> {
  const bytecode = await new PublicAPI(node_url).getAddressesBytecode({
    address,
    is_final: waitFinal,
  })

  return bytecode.length === 0
}
