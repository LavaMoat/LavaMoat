/**
 * Provides functions for loading and reading Capability Files.
 *
 * @packageDocumentation
 */

import { readFile } from 'node:fs/promises'
import * as path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { readPolicy } from '../policy-util.js'
import { ExecutionError } from '../error.js'
import { hrCode, hrPath } from '../format.js'

/**
 * @import {LavaMoatPolicy, CapabilityIndex} from '@lavamoat/types'
 */

/**
 * A {@link CapabilityIndex} entry whose `file` has been resolved to an absolute
 * path, along with enough context to produce useful error messages.
 *
 * @typedef ResolvedCapabilityFile
 * @property {string} absFile Absolute path to the Capability File
 * @property {string} file The `file` value as originally written in the entry
 * @property {string} origin Human-readable description of where the entry came
 *   from (e.g. `Capability Module './foo.js'`)
 */

/**
 * Coerces a file path or URL into a URL.
 *
 * @param {string | URL} location
 * @returns {URL}
 */
const toURL = (location) =>
  typeof location === 'string' ? pathToFileURL(location) : location

/**
 * Imports a single Capability Module and returns its (shape-checked, but not
 * entry-validated) default export along with the URL it was loaded from.
 *
 * A **Capability Module** is a JS module (ESM or CJS) whose default export is
 * an array of `{ names: string[], file: string }` entries. It is a _manifest_:
 * it maps capability names to the file paths of the Capability Files that
 * implement them. The module itself does _not_ call `defineCapability` or
 * `repair`.
 *
 * @param {string} specifier The `use` entry, resolved against `baseURL`
 * @param {URL} baseURL
 * @returns {Promise<{ moduleURL: URL; entries: CapabilityIndex[] }>}
 */
const importCapabilityModule = async (specifier, baseURL) => {
  const moduleURL = new URL(specifier, baseURL)

  /** @type {Record<string, unknown>} */
  let moduleNamespace
  try {
    moduleNamespace = await import(moduleURL.href)
  } catch (err) {
    throw new ExecutionError(
      `Failed to load Capability Module ${hrPath(specifier)}`,
      { cause: err }
    )
  }

  const entries = moduleNamespace.default
  if (!Array.isArray(entries)) {
    throw new ExecutionError(
      `Capability Module ${hrPath(specifier)} must have a default export of an array of ${hrCode('{ names: string[], file: string }')} entries`
    )
  }

  return { moduleURL, entries }
}

/**
 * Validates {@link CapabilityIndex} entries and resolves each entry's `file` to
 * an absolute path.
 *
 * Relative `file` paths are resolved against the directory of `baseURL` so
 * authors can write `file: './cap-impl.js'`. Absolute paths (including those
 * produced by `require.resolve` or `import.meta.dirname + '/x.js'`) are kept
 * as-is. If `baseURL` isn't on disk (e.g. a `data:` URL), there is no
 * meaningful base directory, so `file` must be absolute.
 *
 * @param {CapabilityIndex[]} entries
 * @param {URL} baseURL Location whose directory relative `file` paths resolve
 *   against
 * @param {string} origin Description of the entries' source, for error messages
 * @returns {ResolvedCapabilityFile[]}
 */
const resolveCapabilityFiles = (entries, baseURL, origin) =>
  entries.map((entry) => {
    if (
      !entry ||
      typeof entry !== 'object' ||
      !Array.isArray(entry.names) ||
      typeof entry.file !== 'string'
    ) {
      throw new ExecutionError(
        `${origin} entries must be of the shape ${hrCode('{ names: string[], file: string }')}`
      )
    }

    if (path.isAbsolute(entry.file)) {
      return { absFile: entry.file, file: entry.file, origin }
    }

    if (baseURL.protocol !== 'file:') {
      throw new ExecutionError(
        `${origin} has no on-disk location to resolve against; its ${hrCode('file')} paths must be absolute (got ${hrCode(entry.file)})`
      )
    }

    const baseDir = path.dirname(fileURLToPath(baseURL))
    return {
      absFile: path.resolve(baseDir, entry.file),
      file: entry.file,
      origin,
    }
  })

/**
 * Reads each unique Capability File (deduped by absolute path), concurrently.
 *
 * @param {Iterable<ResolvedCapabilityFile>} files
 * @returns {Promise<string[]>} Source texts in order of first appearance of
 *   each unique file in `files`
 */
const readCapabilityFiles = async (files) => {
  /** @type {Map<string, ResolvedCapabilityFile>} */
  const uniqueFiles = new Map()
  for (const resolved of files) {
    if (!uniqueFiles.has(resolved.absFile)) {
      uniqueFiles.set(resolved.absFile, resolved)
    }
  }

  return Promise.all(
    [...uniqueFiles.values()].map(async ({ absFile, file, origin }) => {
      try {
        return await readFile(absFile, 'utf8')
      } catch (err) {
        throw new ExecutionError(
          `Failed to read Capability File ${hrPath(file)} (from ${origin}): ${
            err instanceof Error ? err.message : String(err)
          }`,
          { cause: err }
        )
      }
    })
  )
}

/**
 * Loads the Capability Modules declared in Policy referenced by path from its
 * `policy.use`, reads each unique Capability File they reference, and returns
 * the ordered deduped array of Capability File source texts to hand to
 * {@link evaluateCapabilities}.
 *
 * It's **recommended to provide args `[policy, policyPath]`**, since a Policy
 * loaded in this way is not cached anywhere.
 *
 * A **Capability File** is the implementation file referenced by a Capability
 * Module entry. It is evaluated later by {@link evaluateCapabilities} with
 * `defineCapability` and `repair` in scope.
 *
 * Capability Modules are imported concurrently. If you have already imported
 * them yourself, use {@link readCapabilitySources} instead.
 *
 * @overload
 * @param {string | URL} policyPath Filepath used as the base for resolving each
 *   `use` entry.
 * @returns {Promise<string[]>} Deduped Capability File source texts, in the
 *   order their Capability Modules appear in `policy.use`.
 * @public
 */
/**
 * Loads the Capability Modules declared in `policy.use`, reads each unique
 * Capability File they reference, and returns the ordered deduped array of
 * Capability File source texts to hand to {@link evaluateCapabilities}.
 *
 * A **Capability File** is the implementation file referenced by a Capability
 * Module entry. It is evaluated later by {@link evaluateCapabilities} with
 * `defineCapability` and `repair` in scope.
 *
 * Capability Modules are imported concurrently. If you have already imported
 * them yourself, use {@link readCapabilitySources} instead.
 *
 * @overload
 * @param {LavaMoatPolicy} policy LavaMoat policy
 * @param {string | URL} policyPath Filepath used as the base for resolving each
 *   `use` entry.
 * @returns {Promise<string[]>} Deduped Capability File source texts, in the
 *   order their Capability Modules appear in `policy.use`.
 * @public
 */
/**
 * @param {LavaMoatPolicy | string | URL} policy LavaMoat policy
 * @param {string | URL} [policyPath] Filepath used as the base for resolving
 *   each `use` entry.
 * @returns {Promise<string[]>} Deduped Capability File source texts, in the
 *   order their Capability Modules appear in `policy.use`.
 * @public
 */
export async function loadCapabilitySources(policy, policyPath) {
  if (typeof policy === 'string' || policy instanceof URL) {
    policyPath = policy
    policy = await readPolicy(policyPath)
  }
  const use = policy.use ?? []
  const baseURL = toURL(/** @type {string | URL} */ (policyPath))

  const resolvedPerModule = await Promise.all(
    use.map(async (specifier) => {
      const { moduleURL, entries } = await importCapabilityModule(
        specifier,
        baseURL
      )
      return resolveCapabilityFiles(
        entries,
        moduleURL,
        `Capability Module ${hrPath(specifier)}`
      )
    })
  )

  return readCapabilityFiles(resolvedPerModule.flat())
}

/**
 * Resolves and reads the Capability Files referenced by already-imported
 * {@link CapabilityIndex} entries; the counterpart to
 * {@link loadCapabilitySources} for callers who have done the importing
 * themselves (or who build their entries programmatically).
 *
 * A policy is what opts in to capabilities, so the policy's location is always
 * required. Note the difference from {@link loadCapabilitySources}, where each
 * relative `file` resolves against its own Capability Module: here there is no
 * module location to go on, so relative `file` paths resolve against the
 * directory of `policyPath`.
 *
 * @example
 *
 * ```js
 * import capabilities from './my-capabilities.js'
 *
 * const sources = await readCapabilitySources(
 *   capabilities,
 *   new URL('./lavamoat/node/policy.json', import.meta.url)
 * )
 * ```
 *
 * @param {Iterable<CapabilityIndex | CapabilityIndex[]>} indices Either a
 *   single Capability Module's default export, or an array of them. Nested
 *   arrays are flattened one level.
 * @param {string | URL} policyPath Location of the policy file that opts in to
 *   `indices`; relative `file` paths are resolved against its directory.
 * @returns {Promise<string[]>} Deduped Capability File source texts, in order
 *   of first appearance.
 * @public
 */
export const readCapabilitySources = async (indices, policyPath) => {
  const indicesArr = [...indices]
  if (!indicesArr.length) {
    return []
  }
  const entries = indicesArr.flat()

  return readCapabilityFiles(
    resolveCapabilityFiles(
      entries,
      toURL(policyPath),
      'provided Capability Index'
    )
  )
}
