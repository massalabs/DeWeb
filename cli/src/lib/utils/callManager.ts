import {
  Args,
  CallSCOptions,
  Operation,
  OperationStatus,
  SmartContract,
} from '@massalabs/massa-web3'

export interface FunctionCall {
  sc: SmartContract
  functionName: string
  args?: Args | Uint8Array
  options?: CallSCOptions
}

export enum CallStatus {
  WaitingUpload = 0,
  Sent = 1,
  Success = 2,
  Error = 3,
}

export interface CallUpdate {
  functionCall: FunctionCall
  status: CallStatus
  operation?: Operation
  error?: any // eslint-disable-line @typescript-eslint/no-explicit-any
}

/**
 * Manages the execution of multiple smart contract calls.
 * The calls are executed concurrently up to a maximum number of operations.
 * The status of each call is updated as it progresses.
 */
export class CallManager {
  private functionCalls: CallUpdate[]
  private maxConcurrentOps: number
  private operations: Operation[] = []

  /**
   * Create a new CallManager instance.
   * @param functionCalls - Array of SmartContractCall instances
   * @param maxConcurrentOps - Maximum number of operations to execute concurrently
   */
  constructor(functionCalls: FunctionCall[], maxConcurrentOps: number = 1) {
    this.functionCalls = functionCalls.map((call) => ({
      functionCall: call,
      status: CallStatus.WaitingUpload,
    }))
    this.maxConcurrentOps = maxConcurrentOps
  }

  /**
   * Perform all the calls concurrently, up to the maximum number of operations.
   * The status of each call is updated as it progresses.
   * @param onUpdate - Callback function to update the status of each call
   * @returns - Array of calls that failed
   */
  async performCalls(
    onUpdate: (callUpdate: CallUpdate) => void
  ): Promise<CallUpdate[]> {
    const activeCalls: Promise<void>[] = []

    for (const callUpdate of this.functionCalls) {
      if (activeCalls.length >= this.maxConcurrentOps) {
        await Promise.race(activeCalls)
      }

      const callPromise = this.performCall(callUpdate, onUpdate).finally(() => {
        const index = activeCalls.indexOf(callPromise)
        if (index > -1) activeCalls.splice(index, 1)
      })

      activeCalls.push(callPromise)
    }

    await Promise.all(activeCalls)

    return this.functionCalls.filter((call) => call.status === CallStatus.Error)
  }

  private async performCall(
    callUpdate: CallUpdate,
    onUpdate: (callUpdate: CallUpdate) => void
  ): Promise<void> {
    const { functionCall } = callUpdate

    callUpdate.status = CallStatus.Sent
    onUpdate(callUpdate)

    try {
      // Execute the call and store the operation
      const operation = await functionCall.sc.call(
        functionCall.functionName,
        functionCall.args,
        functionCall.options
      )
      callUpdate.operation = operation
      this.operations.push(operation)

      // Wait for the operation to complete and update the status accordingly
      const status = await operation.waitSpeculativeExecution()

      if (
        status === OperationStatus.Success ||
        status === OperationStatus.SpeculativeSuccess
      ) {
        callUpdate.status = CallStatus.Success
      } else if (
        status === OperationStatus.Error ||
        status === OperationStatus.SpeculativeError
      ) {
        callUpdate.status = CallStatus.Error
      }

      onUpdate(callUpdate)
    } catch (error) {
      callUpdate.status = CallStatus.Error
      callUpdate.error = error
      onUpdate(callUpdate)
      console.error(
        `Call to ${functionCall.sc.address} ${functionCall.functionName} failed:`,
        error
      )
    }
  }

  getCallUpdates(): CallUpdate[] {
    return this.functionCalls
  }

  getOperations(): Operation[] {
    return this.operations
  }
}
