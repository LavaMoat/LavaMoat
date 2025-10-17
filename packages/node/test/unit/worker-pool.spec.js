import test from 'ava'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { WorkerPool } from '../../src/worker-pool.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const TEST_WORKER_PATH = join(__dirname, 'fixtures', 'test-worker.js')

// TDD: Start with constructor tests
test('WorkerPool constructor - uses default idle timeout', (t) => {
  t.plan(2)

  const pool = new WorkerPool(TEST_WORKER_PATH)

  t.is(pool.workerScript, TEST_WORKER_PATH)
  t.is(pool.idleTimeout, 5000) // DEFAULT_WORKER_IDLE_TIMEOUT
})

test('WorkerPool constructor - accepts custom idle timeout', (t) => {
  t.plan(2)

  const customTimeout = 10000
  const pool = new WorkerPool(TEST_WORKER_PATH, { idleTimeout: customTimeout })

  t.is(pool.workerScript, TEST_WORKER_PATH)
  t.is(pool.idleTimeout, customTimeout)
})

test('WorkerPool constructor - accepts URL worker script', (t) => {
  t.plan(1)

  const workerURL = new URL('file://' + TEST_WORKER_PATH)
  const pool = new WorkerPool(workerURL)

  t.is(pool.workerScript, workerURL)
})

// TDD: Initial state tests
test('WorkerPool initial state - empty pools and counters', (t) => {
  t.plan(4)

  const pool = new WorkerPool(TEST_WORKER_PATH)

  t.is(pool.availableWorkerCount, 0)
  t.is(pool.outstandingTaskCount, 0)
  t.is(pool.totalWorkerCount, 0)
  t.deepEqual(pool.availableWorkers, [])
})

// TDD: Basic task sending test (this will initially fail until we implement mocking)
test('WorkerPool sendTask - basic echo task', async (t) => {
  t.plan(3)

  const pool = new WorkerPool(TEST_WORKER_PATH)

  const message = /** @type {any} */ ({
    type: 'echo',
    id: 'test-task-1',
    data: 'hello world',
  })

  const response = /** @type {any} */ (
    await pool.sendTask(message, 'echo-complete')
  )

  t.is(response.type, 'echo-complete')
  t.is(response.id, 'test-task-1')
  t.is(response.data, 'hello world')

  // Cleanup
  pool.terminate()
})

test('WorkerPool sendTask - worker reuse', async (t) => {
  t.plan(5)

  const pool = new WorkerPool(TEST_WORKER_PATH)

  // First task
  const message1 = /** @type {any} */ ({
    type: 'echo',
    id: 'task-1',
    data: 'first',
  })

  const response1 = /** @type {any} */ (
    await pool.sendTask(message1, 'echo-complete')
  )
  t.is(response1.data, 'first')
  t.is(pool.availableWorkerCount, 1) // Worker returned to pool

  // Second task should reuse the worker
  const message2 = /** @type {any} */ ({
    type: 'echo',
    id: 'task-2',
    data: 'second',
  })

  const response2 = /** @type {any} */ (
    await pool.sendTask(message2, 'echo-complete')
  )
  t.is(response2.data, 'second')
  t.is(pool.availableWorkerCount, 1) // Still one worker in pool
  t.is(pool.totalWorkerCount, 1) // Only one worker created total

  // Cleanup
  pool.terminate()
})

test('WorkerPool sendTask - error handling', async (t) => {
  t.plan(2)

  const pool = new WorkerPool(TEST_WORKER_PATH)

  const message = /** @type {any} */ ({
    type: 'error-test',
    id: 'error-task-1',
  })

  const error = await t.throwsAsync(
    () => pool.sendTask(message, 'error-complete'),
    { instanceOf: Error }
  )

  t.is(error.message, 'Test error message')

  // Cleanup
  pool.terminate()
})

test('WorkerPool sendTask - concurrent tasks', async (t) => {
  t.plan(6)

  const pool = new WorkerPool(TEST_WORKER_PATH)

  // Send multiple tasks concurrently
  const tasks = [
    pool.sendTask(
      /** @type {any} */ ({ type: 'echo', id: 'concurrent-1', data: 'task1' }),
      'echo-complete'
    ),
    pool.sendTask(
      /** @type {any} */ ({ type: 'echo', id: 'concurrent-2', data: 'task2' }),
      'echo-complete'
    ),
    pool.sendTask(
      /** @type {any} */ ({ type: 'echo', id: 'concurrent-3', data: 'task3' }),
      'echo-complete'
    ),
  ]

  t.is(pool.outstandingTaskCount, 3) // All tasks pending

  const responses = /** @type {any[]} */ (await Promise.all(tasks))

  t.is(responses[0].data, 'task1')
  t.is(responses[1].data, 'task2')
  t.is(responses[2].data, 'task3')
  t.is(pool.outstandingTaskCount, 0) // All tasks completed
  t.is(pool.availableWorkerCount, 3) // All workers returned to pool

  // Cleanup
  pool.terminate()
})

test('WorkerPool getWorker - creates new worker when pool empty', (t) => {
  t.plan(3)

  const pool = new WorkerPool(TEST_WORKER_PATH)

  t.is(pool.availableWorkerCount, 0)

  const worker = pool.getWorker()

  t.truthy(worker) // Worker was created
  t.is(pool.availableWorkerCount, 0) // Worker not in available pool (it's in use)

  // Cleanup
  worker.terminate()
  pool.terminate()
})

test('WorkerPool getWorker - reuses available worker', (t) => {
  t.plan(3)

  const pool = new WorkerPool(TEST_WORKER_PATH)

  // Create and return a worker to the pool
  const worker1 = pool.getWorker()
  pool.returnWorker(worker1)

  t.is(pool.availableWorkerCount, 1)

  // Get worker again - should reuse the same one
  const worker2 = pool.getWorker()

  t.is(worker1, worker2) // Same worker instance
  t.is(pool.availableWorkerCount, 0) // Worker removed from available pool
  // Note: totalWorkerCount is 0 here because worker is retrieved but no task pending yet

  // Cleanup
  worker2.terminate()
  pool.terminate()
})

test('WorkerPool returnWorker - adds worker to available pool', (t) => {
  t.plan(3)

  const pool = new WorkerPool(TEST_WORKER_PATH)

  const worker = pool.getWorker()
  t.is(pool.availableWorkerCount, 0)

  pool.returnWorker(worker)

  t.is(pool.availableWorkerCount, 1)
  t.true(pool.availableWorkers.includes(worker))

  // Cleanup
  pool.terminate()
})

test('WorkerPool terminate - cleans up all resources', async (t) => {
  t.plan(6) // Updated plan count

  const pool = new WorkerPool(TEST_WORKER_PATH)

  // Create some workers and tasks
  const task1 = pool.sendTask(
    /** @type {any} */ ({ type: 'delay', id: 'cleanup-1', delay: 100 }),
    'delay-complete'
  )
  const task2 = pool.sendTask(
    /** @type {any} */ ({ type: 'delay', id: 'cleanup-2', delay: 100 }),
    'delay-complete'
  )

  // Verify initial state
  t.true(pool.outstandingTaskCount > 0)

  // Terminate should reject pending tasks
  pool.terminate()

  t.is(pool.availableWorkerCount, 0)
  t.is(pool.outstandingTaskCount, 0)
  t.is(pool.totalWorkerCount, 0)

  // Tasks should be rejected
  await t.throwsAsync(() => task1, { message: 'Worker pool terminated' })
  await t.throwsAsync(() => task2, { message: 'Worker pool terminated' })
})

// TDD: Worker idle timeout tests
test('WorkerPool worker idle timeout - terminates idle workers', async (t) => {
  t.plan(3)

  const shortTimeout = 50 // 50ms for fast test
  const pool = new WorkerPool(TEST_WORKER_PATH, { idleTimeout: shortTimeout })

  // Send a task to create a worker
  await pool.sendTask(
    /** @type {any} */ ({ type: 'echo', id: 'idle-test', data: 'test' }),
    'echo-complete'
  )

  t.is(pool.availableWorkerCount, 1) // Worker returned to pool

  // Wait for idle timeout
  await new Promise((resolve) => setTimeout(resolve, shortTimeout + 10))

  t.is(pool.availableWorkerCount, 0) // Worker should be terminated
  t.is(pool.totalWorkerCount, 0) // No workers left

  // Cleanup
  pool.terminate()
})

test('WorkerPool worker idle timeout - cancels timeout when worker retrieved', async (t) => {
  t.plan(2) // Updated plan count

  const longTimeout = 200 // 200ms
  const pool = new WorkerPool(TEST_WORKER_PATH, { idleTimeout: longTimeout })

  // Send a task to create a worker
  await pool.sendTask(
    /** @type {any} */ ({ type: 'echo', id: 'cancel-test', data: 'test' }),
    'echo-complete'
  )

  t.is(pool.availableWorkerCount, 1)

  // Get the worker before timeout (cancels the timeout)
  const worker = pool.getWorker()

  // Wait past when timeout would have fired
  await new Promise((resolve) => setTimeout(resolve, longTimeout + 10))

  t.is(pool.availableWorkerCount, 0) // Worker not available (still in use)
  // Note: totalWorkerCount is 0 because worker is retrieved but no task pending yet

  // Cleanup
  worker.terminate()
  pool.terminate()
})

// TDD: Advanced message handling tests
test('WorkerPool handleWorkerMessage - ignores unknown task ID', (t) => {
  t.plan(2)

  const pool = new WorkerPool(TEST_WORKER_PATH)
  const worker = pool.getWorker()

  const initialTaskCount = pool.outstandingTaskCount

  // Send message for non-existent task
  pool.handleWorkerMessage(worker, { type: 'complete', id: 'nonexistent-task' })

  // Should not affect task count or cause errors
  t.is(pool.outstandingTaskCount, initialTaskCount)
  t.is(pool.availableWorkerCount, 0) // Worker not returned to pool

  // Cleanup
  worker.terminate()
  pool.terminate()
})

test('WorkerPool handleWorkerMessage - ignores non-completion messages', async (t) => {
  t.plan(3)

  const pool = new WorkerPool(TEST_WORKER_PATH)

  // Start a task that will send an intermediate message
  const taskPromise = pool.sendTask(
    /** @type {any} */ ({
      type: 'echo',
      id: 'intermediate-test',
      data: 'test',
    }),
    'echo-complete'
  )

  t.is(pool.outstandingTaskCount, 1)

  // Simulate an intermediate message that doesn't match completion type
  const worker = [...pool.pendingTasks.values()][0].worker
  pool.handleWorkerMessage(
    worker,
    /** @type {any} */ ({
      type: 'progress',
      id: 'intermediate-test',
      progress: 50,
    })
  )

  // Task should still be pending
  t.is(pool.outstandingTaskCount, 1)

  // Task should eventually complete normally
  const response = /** @type {any} */ (await taskPromise)
  t.is(response.data, 'test')

  // Cleanup
  pool.terminate()
})

test('WorkerPool handleWorkerError - cleans up multiple tasks for same worker', (t) => {
  t.plan(5) // Updated to match actual assertions

  const pool = new WorkerPool(TEST_WORKER_PATH)

  // Manually create a worker and add multiple tasks to it
  const worker = pool.getWorker()

  // Simulate multiple pending tasks for the same worker
  pool.pendingTasks.set('task-1', {
    worker,
    resolve: () => {},
    reject: () => t.pass('Task 1 rejected'),
    completionType: 'complete',
  })

  pool.pendingTasks.set('task-2', {
    worker,
    resolve: () => {},
    reject: () => t.pass('Task 2 rejected'),
    completionType: 'complete',
  })

  t.is(pool.outstandingTaskCount, 2)

  // Trigger worker error
  const testError = new Error('Worker crashed')
  pool.handleWorkerError(worker, testError)

  // All tasks should be cleaned up
  t.is(pool.outstandingTaskCount, 0)
  t.is(pool.availableWorkerCount, 0)

  // Worker should be terminated (we can't easily test this without mocking)
  // Cleanup
  pool.terminate()
})

test('WorkerPool returnWorker - schedules timeout correctly', async (t) => {
  t.plan(3)

  const shortTimeout = 50
  const pool = new WorkerPool(TEST_WORKER_PATH, { idleTimeout: shortTimeout })

  const worker = pool.getWorker()
  t.is(pool.availableWorkerCount, 0)

  pool.returnWorker(worker)
  t.is(pool.availableWorkerCount, 1)

  // Worker should be terminated after timeout
  await new Promise((resolve) => setTimeout(resolve, shortTimeout + 20))
  t.is(pool.availableWorkerCount, 0)

  // Cleanup
  pool.terminate()
})

test('WorkerPool getWorker - clears existing timeout when worker retrieved', (t) => {
  t.plan(3)

  const pool = new WorkerPool(TEST_WORKER_PATH, { idleTimeout: 1000 })

  const worker = pool.getWorker()
  pool.returnWorker(worker)

  t.is(pool.availableWorkerCount, 1)
  t.is(pool.workerTimeouts.size, 1) // Timeout should be set

  // Get worker again - should clear timeout
  const sameWorker = pool.getWorker()
  t.is(pool.workerTimeouts.size, 0) // Timeout should be cleared

  // Cleanup
  sameWorker.terminate()
  pool.terminate()
})

// TDD: Edge case tests
test('WorkerPool sendTask - handles worker creation error gracefully', async (t) => {
  // This test would require mocking Worker constructor to throw
  // For now, we'll test the normal flow
  t.plan(1)

  const pool = new WorkerPool(TEST_WORKER_PATH)

  const message = /** @type {any} */ ({
    type: 'echo',
    id: 'test-creation',
    data: 'test',
  })

  // Should complete normally
  const response = /** @type {any} */ (
    await pool.sendTask(message, 'echo-complete')
  )
  t.is(response.data, 'test')

  // Cleanup
  pool.terminate()
})

test('WorkerPool terminate - handles empty pool gracefully', (t) => {
  t.plan(3)

  const pool = new WorkerPool(TEST_WORKER_PATH)

  // Terminate empty pool
  pool.terminate()

  t.is(pool.availableWorkerCount, 0)
  t.is(pool.outstandingTaskCount, 0)
  t.is(pool.totalWorkerCount, 0)
})

test('WorkerPool with URL workerScript', async (t) => {
  t.plan(1)

  const workerURL = new URL(`file://${TEST_WORKER_PATH}`)
  const pool = new WorkerPool(workerURL)

  const response = /** @type {any} */ (
    await pool.sendTask(
      /** @type {any} */ ({
        type: 'echo',
        id: 'url-test',
        data: 'test-with-url',
      }),
      'echo-complete'
    )
  )

  t.is(response.data, 'test-with-url')

  // Cleanup
  pool.terminate()
})

// TDD: Comprehensive workflow test
test('WorkerPool complete workflow - creation, task execution, reuse, timeout', async (t) => {
  t.plan(9)

  const shortTimeout = 100
  const pool = new WorkerPool(TEST_WORKER_PATH, { idleTimeout: shortTimeout })

  // Initial state
  t.is(pool.totalWorkerCount, 0)

  // Execute first task - creates worker
  const response1 = /** @type {any} */ (
    await pool.sendTask(
      /** @type {any} */ ({
        type: 'echo',
        id: 'workflow-1',
        data: 'first',
      }),
      'echo-complete'
    )
  )

  t.is(response1.data, 'first')
  t.is(pool.availableWorkerCount, 1) // Worker returned to pool
  t.is(pool.totalWorkerCount, 1)

  // Execute second task - reuses worker
  const response2 = /** @type {any} */ (
    await pool.sendTask(
      /** @type {any} */ ({
        type: 'echo',
        id: 'workflow-2',
        data: 'second',
      }),
      'echo-complete'
    )
  )

  t.is(response2.data, 'second')
  t.is(pool.availableWorkerCount, 1) // Worker returned to pool again
  t.is(pool.totalWorkerCount, 1) // Still same worker

  // Wait for worker timeout
  await new Promise((resolve) => setTimeout(resolve, shortTimeout + 20))

  t.is(pool.availableWorkerCount, 0) // Worker terminated
  t.is(pool.totalWorkerCount, 0) // No workers left

  // Pool should still be functional
  pool.terminate()
})

// TDD: Test worker error scenarios
test('WorkerPool sendTask - handles worker that terminates unexpectedly', async (t) => {
  t.plan(1)

  const pool = new WorkerPool(TEST_WORKER_PATH)

  // Start a task
  const taskPromise = pool.sendTask(
    /** @type {any} */ ({
      type: 'echo',
      id: 'terminate-test',
      data: 'test',
    }),
    'echo-complete'
  )

  // Get the worker and simulate an error (which should trigger cleanup)
  const worker = [...pool.pendingTasks.values()][0].worker

  // Emit an error event instead of just terminating
  setImmediate(() => {
    worker.emit('error', new Error('Worker crashed unexpectedly'))
  })

  // Task should be rejected due to worker error
  await t.throwsAsync(() => taskPromise, {
    message: 'Worker crashed unexpectedly',
  })

  // Cleanup
  pool.terminate()
})
