// @ts-check
'use strict'

const { readFileSync } = require('node:fs')
const { createRequire } = require('node:module')
const { join } = require('node:path')

/** @import {LavaMoatPolicy} from '@lavamoat/types' */

/**
 * @typedef {Object} CapabilityFragments
 * @property {string[]} capabilitySources Ordered array of capability
 *   implementation file sources. Each entry is the raw source text of one
 *   unique capability file.
 * @property {Record<string, number>} capabilityNames Maps each capability name
 *   to the index in {@link capabilitySources} of its implementation file.
 */

/**
 * Loads and validates all Capability Modules listed in `policy.use`, reads each
 * unique implementation file, and produces the two runtime fragments needed by
 * the webpack runtime.
 *
 * A **Capability Module** is a CommonJS module whose default export is an array
 * of `{ names: string[], file: string }` entries. Each entry maps one or more
 * capability names to a single implementation file.
 *
 * @param {LavaMoatPolicy} policy The LavaMoat policy
 * @param {string} fromDir Directory of the policy file; `use` entries are
 *   resolved relative to this path
 * @returns {CapabilityFragments}
 */
exports.buildCapabilities = (policy, fromDir) => {
  /** @type {string[]} */
  const use = policy.use ?? []

  if (use.length === 0) {
    return { capabilitySources: [], capabilityNames: {} }
  }

  // Create a require function that resolves from the policy file's directory,
  // as if the policy.json itself were importing the capability modules
  const requireFromPolicy = createRequire(join(fromDir, 'policy.json'))

  /** Ordered de-duplicated list of unique file paths */
  const fileOrder = /** @type {string[]} */ ([])
  /** File path → index in fileOrder */
  const fileIndex = /** @type {Map<string, number>} */ (new Map())
  /** Capability name → index in fileOrder */
  const nameToIndex = /** @type {Record<string, number>} */ ({})

  for (const modulePath of use) {
    /** @type {unknown} */
    let capModule
    try {
      capModule = requireFromPolicy(modulePath)
    } catch (err) {
      throw new Error(
        `LavaMoat: failed to load Capability Module '${modulePath}': ${/** @type {Error} */ (err).message}`,
        { cause: err }
      )
    }

    if (!Array.isArray(capModule)) {
      throw new Error(
        `LavaMoat: Capability Module '${modulePath}' must export an array of { names, file } entries`
      )
    }

    for (const entry of capModule) {
      if (
        !entry ||
        typeof entry !== 'object' ||
        !Array.isArray(entry.names) ||
        typeof entry.file !== 'string'
      ) {
        throw new Error(
          `LavaMoat: Capability Module '${modulePath}' must export an array of { names: string[], file: string } entries`
        )
      }

      const { names, file } = entry

      // Register file — duplicate file path is an error
      if (fileIndex.has(file)) {
        throw new Error(
          `LavaMoat: capability file '${file}' is already referenced by another Capability Module`
        )
      }
      const idx = fileOrder.length
      fileOrder.push(file)
      fileIndex.set(file, idx)

      // Register each name, detecting collisions
      for (const name of names) {
        if (Object.prototype.hasOwnProperty.call(nameToIndex, name)) {
          throw new Error(
            `LavaMoat: duplicate capability name '${name}' found across Capability Modules`
          )
        }
        nameToIndex[name] = idx
      }
    }
  }

  // Read each unique file's source
  const capabilitySources = fileOrder.map((file) => {
    try {
      return readFileSync(file, 'utf8')
    } catch (err) {
      throw new Error(
        `LavaMoat: failed to read capability file '${file}': ${/** @type {Error} */ (err).message}`,
        { cause: err }
      )
    }
  })

  return { capabilitySources, capabilityNames: nameToIndex }
}
