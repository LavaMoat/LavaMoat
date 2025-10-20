/**
 * Simple test worker for WorkerPool tests
 */
import { parentPort } from 'node:worker_threads'

if (parentPort) {
  parentPort.on('message', (message) => {
    const { type, id } = message

    // Echo back the message with completion type
    if (type === 'echo') {
      parentPort?.postMessage({
        type: 'echo-complete',
        id,
        data: message.data,
      })
    } else if (type === 'error-test') {
      parentPort?.postMessage({
        type: 'error',
        id,
        error: 'Test error message',
      })
    } else if (type === 'delay') {
      setTimeout(() => {
        parentPort?.postMessage({
          type: 'delay-complete',
          id,
          data: 'delayed response',
        })
      }, message.delay || 10)
    }
  })
}
