/**
 * Provides {@link LMRCache}
 *
 * @packageDescription
 */

import { LavamoatModuleRecord } from 'lavamoat-core'

/** @type {unique symbol} */
const kCtor = Symbol('LMRCache.ctor')

/**
 * @import {SimpleLavamoatModuleRecordOptions} from '../internal.js'
 */

/**
 * This class represents a transient cache for
 * {@link LavamoatModuleRecord LavamoatModuleRecords}.
 *
 * It's a thin wrapper around a `Map` and behaves like a _write-once_ `Set`. The
 * keys are {@link LMRCache.#keyFor computed}.
 *
 * - It is not possible to "set" the same key multiple times.
 * - It is not possible to delete items.
 *
 * @internal
 */
export class LMRCache {
  /** @type {Map<string, LavamoatModuleRecord>} */
  #cache = new Map()

  /**
   * Use {@link LMRCache.create} instead.
   *
   * @private
   * @param {kCtor} key Private key
   */
  constructor(key) {
    if (key !== kCtor) {
      throw new TypeError(
        `LMRCache cannot be instantiated directly; use LMRCache.create()`
      )
    }
  }

  /**
   * Computes the cache key for a given {@link LavamoatModuleRecord} or its
   * options.
   *
   * @param {SimpleLavamoatModuleRecordOptions | LavamoatModuleRecord} moduleRecord
   * @returns {string}
   * @todo Determine if this is appropriately unique
   */
  static #keyFor({ specifier, file }) {
    return `${specifier}:${file}`
  }

  /**
   * Factory for a new {@link LMRCache}.
   *
   * @returns {LMRCache}
   */
  static create() {
    return new LMRCache(kCtor)
  }

  /**
   * Returns `true` if the cache has a {@link LavamoatModuleRecord} for the given
   * options or record.
   *
   * @param {SimpleLavamoatModuleRecordOptions | LavamoatModuleRecord} moduleRecord
   * @returns {boolean}
   */
  has(moduleRecord) {
    return this.#cache.has(LMRCache.#keyFor(moduleRecord))
  }

  /**
   * Adds a new {@link LavamoatModuleRecord} to the cache by
   * `LavaMoatModuleRecord` or options
   *
   * @param {SimpleLavamoatModuleRecordOptions | LavamoatModuleRecord} moduleRecord
   * @returns {LMRCache}
   */
  add(moduleRecord) {
    const key = LMRCache.#keyFor(moduleRecord)
    if (this.has(moduleRecord)) {
      throw new ReferenceError(
        `Module record with key "${key}" already exists in cache; this is a bug`
      )
    }
    const newModuleRecord =
      moduleRecord instanceof LavamoatModuleRecord
        ? moduleRecord
        : new LavamoatModuleRecord(moduleRecord)
    this.#cache.set(key, newModuleRecord)
    return this
  }

  /**
   * Gets or creates a new {@link LavamoatModuleRecord} for the given
   * `LavamoatModuleRecord` or options.
   *
   * @param {SimpleLavamoatModuleRecordOptions | LavamoatModuleRecord} opts
   * @returns {LavamoatModuleRecord | undefined}
   */
  get(opts) {
    const key = LMRCache.#keyFor(opts)
    return this.#cache.get(key)
  }
}
