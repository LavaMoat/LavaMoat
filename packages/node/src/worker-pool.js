/**
 * Generic worker pool for managing worker threads
 *
 * @packageDocumentation
 * @internal
 */

import { availableParallelism } from 'node:os'
import { Worker } from 'node:worker_threads'

/**
 * @import {BaseMessage, WorkerPoolOptions} from './internal.js'
 */

/**
 * Default idle timeout for workers
 */
const DEFAULT_WORKER_IDLE_TIMEOUT = 1000

/**
 * Default max workers: one fewer than available parallelism, leaving a core
 * free for the main thread. Always at least 1.
 */
const DEFAULT_MAX_WORKERS = Math.max(1, availableParallelism() - 1)

/**
 * @template {BaseMessage} TMessage - Message type that extends BaseMessage
 * @template {BaseMessage} TResponse - Response type that extends BaseMessage
 */
export class WorkerPool {
  /**
   * Get count of available workers
   *
   * @returns {number}
   */
  get availableWorkerCount() {
    return this.availableWorkers.length
  }

  /**
   * Get count of outstanding tasks
   *
   * @returns {number}
   */
  get outstandingTaskCount() {
    return this.pendingTasks.size
  }

  /**
   * Get count of tasks waiting for a worker
   *
   * @returns {number}
   */
  get queuedTaskCount() {
    return this.taskQueue.length
  }

  /**
   * Get total count of workers (available + busy)
   *
   * @returns {number}
   */
  get totalWorkerCount() {
    return this.allWorkers.size
  }

  /**
   * @param {string | URL} workerScript - Path to the worker script
   * @param {WorkerPoolOptions<TMessage, TResponse>} [options] - Configuration
   *   options
   */
  constructor(
    workerScript,
    {
      idleTimeout = DEFAULT_WORKER_IDLE_TIMEOUT,
      maxWorkers = DEFAULT_MAX_WORKERS,
    } = {}
  ) {
    /** @type {string | URL} */
    this.workerScript = workerScript
    /** @type {number} */
    this.idleTimeout = idleTimeout
    /** @type {number} */
    this.maxWorkers = Math.max(1, maxWorkers)

    /** @type {Worker[]} */
    this.availableWorkers = []
    /**
     * @type {Map<
     *   string,
     *   {
     *     worker: Worker
     *     resolve: Function
     *     reject: Function
     *     completionType: string
     *   }
     * >}
     */
    this.pendingTasks = new Map()
    /** @type {Map<Worker, NodeJS.Timeout>} */
    this.workerTimeouts = new Map()
    /** @type {Set<Worker>} */
    this.allWorkers = new Set()

    /**
     * Tasks waiting for an available worker when at capacity.
     *
     * @type {{
     *   message: TMessage
     *   completionType: string
     *   resolve: Function
     *   reject: Function
     * }[]}
     */
    this.taskQueue = []
  }

  /**
   * Get or create a worker, returning `undefined` when at capacity with no idle
   * workers available.
   *
   * @returns {Worker | undefined}
   */
  getWorker() {
    let worker = this.availableWorkers.pop()
    if (!worker) {
      if (this.allWorkers.size >= this.maxWorkers) {
        return undefined
      }
      worker = new Worker(this.workerScript)
      this.allWorkers.add(worker)
      const boundWorker = worker
      worker.on('message', (message) => {
        this.handleWorkerMessage(boundWorker, message)
      })
      worker.on('error', (error) => {
        this.handleWorkerError(boundWorker, error)
      })
    }

    // Clear any existing timeout for this worker
    const timeout = this.workerTimeouts.get(worker)
    if (timeout) {
      clearTimeout(timeout)
      this.workerTimeouts.delete(worker)
    }

    return worker
  }

  /**
   * Handle worker error
   *
   * @param {Worker} worker
   * @param {Error} error
   */
  handleWorkerError(worker, error) {
    // Find and reject all pending tasks for this worker
    for (const [taskId, task] of this.pendingTasks.entries()) {
      if (task.worker === worker) {
        this.pendingTasks.delete(taskId)
        task.reject(error)
      }
    }

    // Remove worker from available workers and terminate
    const index = this.availableWorkers.indexOf(worker)
    if (index !== -1) {
      this.availableWorkers.splice(index, 1)
    }

    const timeout = this.workerTimeouts.get(worker)
    if (timeout) {
      clearTimeout(timeout)
      this.workerTimeouts.delete(worker)
    }

    this.allWorkers.delete(worker)
    worker.terminate()
  }

  /**
   * Handle message from worker
   *
   * @param {Worker} worker
   * @param {TResponse} message
   */
  handleWorkerMessage(worker, message) {
    const taskId = message.id
    const task = this.pendingTasks.get(taskId)

    if (task) {
      // Check if this message type matches the expected completion type
      if (message.type === task.completionType) {
        this.pendingTasks.delete(taskId)
        task.resolve(message)
        this.returnWorker(worker)
      } else if (message.type === 'error') {
        this.pendingTasks.delete(taskId)
        task.reject(
          new Error(/** @type {any} */ (message).error || 'Worker error')
        )
        this.returnWorker(worker)
      }
      // For other message types, we just ignore them and keep the task pending
    }
  }

  /**
   * Return worker to pool, dispatching a queued task if one is waiting, or
   * scheduling the worker for idle termination otherwise.
   *
   * @param {Worker} worker
   */
  returnWorker(worker) {
    const queued = this.taskQueue.shift()
    if (queued) {
      const taskId = queued.message.id
      this.pendingTasks.set(taskId, {
        completionType: queued.completionType,
        reject: queued.reject,
        resolve: queued.resolve,
        worker,
      })
      worker.postMessage(queued.message)
      return
    }

    this.availableWorkers.push(worker)

    // Schedule worker termination after idle timeout
    const timeout = setTimeout(() => {
      const index = this.availableWorkers.indexOf(worker)
      if (index !== -1) {
        this.availableWorkers.splice(index, 1)
        this.workerTimeouts.delete(worker)
        this.allWorkers.delete(worker)
        worker.terminate()
      }
    }, this.idleTimeout)

    this.workerTimeouts.set(worker, timeout)
  }

  /**
   * Send task to worker pool.
   *
   * If the pool is at capacity, the task is queued and will be dispatched when
   * a worker becomes available.
   *
   * @param {TMessage} message - The message to send to the worker
   * @param {string} completionType - The message type that indicates task
   *   completion
   * @returns {Promise<TResponse>}
   */
  sendTask(message, completionType) {
    return new Promise((resolve, reject) => {
      const worker = this.getWorker()

      if (!worker) {
        this.taskQueue.push({ completionType, message, reject, resolve })
        return
      }

      const taskId = message.id

      this.pendingTasks.set(taskId, {
        completionType,
        reject,
        resolve,
        worker,
      })

      worker.postMessage(message)
    })
  }

  /**
   * Terminate all workers, reject pending and queued tasks, and clear timeouts
   */
  terminate() {
    // Clear all timeouts
    for (const timeout of this.workerTimeouts.values()) {
      clearTimeout(timeout)
    }
    this.workerTimeouts.clear()

    const terminationError = new Error('Worker pool terminated')

    // Reject pending tasks
    for (const task of this.pendingTasks.values()) {
      task.reject(terminationError)
    }
    this.pendingTasks.clear()

    // Reject queued tasks
    for (const task of this.taskQueue) {
      task.reject(terminationError)
    }
    this.taskQueue.length = 0

    // Terminate ALL workers (not just available ones)
    for (const worker of this.allWorkers) {
      worker.terminate()
    }
    this.allWorkers.clear()
    this.availableWorkers.length = 0
  }
}
