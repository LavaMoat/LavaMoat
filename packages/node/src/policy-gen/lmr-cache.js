/**
 * Provides {@link LMRCache}
 *
 * @packageDescription
 */

import { LavamoatModuleRecord } from 'lavamoat-core'
import { GenerationError } from '../error.js'

/**
 * @import {SimpleLavamoatModuleRecordOptions} from '../internal.js'
 */

/**
 * This class represents a transient cache for
 * {@link LavamoatModuleRecord LavamoatModuleRecords}.
 *
 * It's a thin wrapper around a `Map` and behaves like a _write-once_ `Set`. The
 * keys are {@link LMRCache.keyFor computed}.
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
   * Computes the cache key for a given {@link LavamoatModuleRecord} or its
   * options.
   *
   * @param {SimpleLavamoatModuleRecordOptions | LavamoatModuleRecord} moduleRecord
   * @returns {string}
   * @todo Determine if this is appropriately unique
   */
  static keyFor({ specifier, file }) {
    return `${specifier}:${file}`
  }

  /**
   * @param {SimpleLavamoatModuleRecordOptions | LavamoatModuleRecord} moduleRecord
   * @returns {boolean}
   */
  has(moduleRecord) {
    return this.#cache.has(LMRCache.keyFor(moduleRecord))
  }

  /**
   * @param {SimpleLavamoatModuleRecordOptions | LavamoatModuleRecord} moduleRecord
   * @returns {LMRCache}
   */
  add(moduleRecord) {
    const key = LMRCache.keyFor(moduleRecord)
    if (this.has(moduleRecord)) {
      throw new GenerationError(
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
   * Gets or creates a new {@link LavamoatModuleRecord} for the given options.
   *
   * @param {SimpleLavamoatModuleRecordOptions | LavamoatModuleRecord} opts
   * @returns {LavamoatModuleRecord | undefined}
   */
  get(opts) {
    const key = LMRCache.keyFor(opts)
    return this.#cache.get(key)
  }
}
