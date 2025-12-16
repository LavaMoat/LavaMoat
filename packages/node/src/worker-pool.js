/**
 * Generic worker pool for managing worker threads
 *
 * @packageDocumentation
 * @internal
 */

import { Worker } from 'node:worker_threads'

/**
 * @import {BaseMessage, WorkerPoolOptions} from './internal.js'
 */

/**
 * Default idle timeout for workers (5 seconds)
 */
const DEFAULT_WORKER_IDLE_TIMEOUT = 5000

/**
 * @template {BaseMessage} TMessage - Message type that extends BaseMessage
 * @template {BaseMessage} TResponse - Response type that extends BaseMessage
 */
export class WorkerPool {
  /**
   * @param {string | URL} workerScript - Path to the worker script
   * @param {WorkerPoolOptions<TMessage, TResponse>} [options] - Configuration
   *   options
   */
  constructor(
    workerScript,
    { idleTimeout = DEFAULT_WORKER_IDLE_TIMEOUT } = {}
  ) {
    /** @type {string | URL} */
    this.workerScript = workerScript
    /** @type {number} */
    this.idleTimeout = idleTimeout

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
  }

  /**
   * Get or create a worker
   *
   * @returns {Worker}
   */
  getWorker() {
    let worker = this.availableWorkers.pop()

    if (!worker) {
      worker = new Worker(this.workerScript)
      this.allWorkers.add(worker)
      const boundWorker = worker // Capture for closure
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
   * Return worker to pool or schedule for termination
   *
   * @param {Worker} worker
   */
  returnWorker(worker) {
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
   * Send task to worker pool
   *
   * @param {TMessage} message - The message to send to the worker
   * @param {string} completionType - The message type that indicates task
   *   completion
   * @returns {Promise<TResponse>}
   */
  sendTask(message, completionType) {
    return new Promise((resolve, reject) => {
      const worker = this.getWorker()
      const taskId = message.id

      this.pendingTasks.set(taskId, {
        worker,
        resolve,
        reject,
        completionType,
      })

      worker.postMessage(message)
    })
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
   * Get count of available workers
   *
   * @returns {number}
   */
  get availableWorkerCount() {
    return this.availableWorkers.length
  }

  /**
   * Get total count of workers (available + busy)
   *
   * @returns {number}
   */
  get totalWorkerCount() {
    return this.availableWorkers.length + this.pendingTasks.size
  }

  /**
   * Terminate all workers and clear timeouts
   */
  terminate() {
    // Clear all timeouts
    for (const timeout of this.workerTimeouts.values()) {
      clearTimeout(timeout)
    }
    this.workerTimeouts.clear()

    // Reject pending tasks
    for (const task of this.pendingTasks.values()) {
      task.reject(new Error('Worker pool terminated'))
    }
    this.pendingTasks.clear()

    // Terminate ALL workers (not just available ones)
    for (const worker of this.allWorkers) {
      worker.terminate()
    }
    this.allWorkers.clear()
    this.availableWorkers.length = 0
  }
}
