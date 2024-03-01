/**
 * Provides {@link LMRCache}
 *
 * @packageDescription
 */

import { LavamoatModuleRecord } from 'lavamoat-core'

/**
 * This class represents a transient cache for
 * {@link LavamoatModuleRecord LavamoatModuleRecords}.
 *
 * It's a thin wrapper around a `Map`; it's used to ensure we don't create
 * duplicate `LavamoatModuleRecord` objects for the same specifiers.
 */
export class LMRCache {
  /** @type {Map<string, LavamoatModuleRecord>} */
  #cache
  constructor() {
    this.#cache = new Map()
  }

  /**
   * Computes the cache key for a given {@link LavamoatModuleRecord} or its
   * options.
   *
   * @param {import('lavamoat-core').LavamoatModuleRecordOptions
   *   | LavamoatModuleRecord} opts
   * @returns {string}
   * @todo Determine if this is appropriately unique
   */
  static keyFor({ specifier, file }) {
    return `${specifier}:${file}`
  }

  /**
   * Gets or creates a new {@link LavamoatModuleRecord} for the given options.
   *
   * @param {import('lavamoat-core').LavamoatModuleRecordOptions} opts
   */
  get(opts) {
    const key = LMRCache.keyFor(opts)
    if (this.#cache.has(key)) {
      return /** @type {LavamoatModuleRecord} */ (this.#cache.get(key))
    }
    const record = new LavamoatModuleRecord(opts)
    this.#cache.set(key, record)
    return record
  }

  /**
   * Clears the cache
   */
  clear() {
    this.#cache.clear()
  }
}
