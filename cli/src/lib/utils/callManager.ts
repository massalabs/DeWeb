import {
  Args,
  CallSCOptions,
  Operation,
  OperationStatus,
  SmartContract,
} from '@massalabs/massa-web3'

export interface SmartContractCall {
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
  call: SmartContractCall
  status: CallStatus
  operation?: Operation
  error?: any
}

/**
 * Manages the execution of multiple smart contract calls.
 * The calls are executed concurrently up to a maximum number of operations.
 * The status of each call is updated as it progresses.
 */
export class CallManager {
  private calls: CallUpdate[]
  private maxConcurrentOps: number
  private operations: Operation[] = []

  /**
   * Create a new CallManager instance.
   * @param calls - Array of SmartContractCall instances
   * @param maxConcurrentOps - Maximum number of operations to execute concurrently
   */
  constructor(
    calls: SmartContractCall[],
    maxConcurrentOps: number = 1
  ) {
    this.calls = calls.map((call) => ({
      call,
      status: CallStatus.WaitingUpload,
    }))
    this.maxConcurrentOps = maxConcurrentOps
  }

  /**
   * Perform all the calls concurrently, up to the maximum number of operations.
   * The status of each call is updated as it progresses.
   * @param onUpdate - Callback function to update the status of each call
   * @returns - Array of CallUpdate instances
   */
  async performCalls(
    onUpdate: (callUpdate: CallUpdate) => void
  ): Promise<CallUpdate[]> {
    const activeCalls: Promise<void>[] = []

    for (const callUpdate of this.calls) {
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

    return this.calls
  }

  private async performCall(
    callUpdate: CallUpdate,
    onUpdate: (callUpdate: CallUpdate) => void
  ): Promise<void> {
    const { call } = callUpdate

    callUpdate.status = CallStatus.Sent
    onUpdate(callUpdate)

    try {
      // Execute the call and store the operation
      const operation = await call.sc.call(
        call.functionName,
        call.args,
        call.options
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
      console.error(`Call to ${call.sc.address} ${call.functionName} failed:`, error)
    }
  }

  getCallUpdates(): CallUpdate[] {
    return this.calls
  }

  getOperations(): Operation[] {
    return this.operations
  }
}
