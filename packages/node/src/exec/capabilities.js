import { readFile } from 'node:fs/promises'
import * as path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

/**
 * @import {LavaMoatPolicy, CapabilityDefinition, CapabilityIndex} from '@lavamoat/types'
 */

/**
 * Loads the Capability Modules declared in `policy.use`, reads each unique
 * Capability File they reference, and returns the ordered deduped array of
 * Capability File source texts to hand to {@link evaluateCapabilities}.
 *
 * A **Capability Module** is a JS module (ESM or CJS) whose default export is
 * an array of `{ names: string[], file: string }` entries. It is a _manifest_:
 * it maps capability names to the file paths of the Capability Files that
 * implement them. The module itself does _not_ call `defineCapability` or
 * `repair`.
 *
 * A **Capability File** is the implementation file referenced by a Capability
 * Module entry. It is evaluated later by
 * {@link module:endowmentsToolkit.evaluateCapabilities evaluateCapabilities}
 * with `defineCapability` and `repair` in scope.
 *
 * @param {LavaMoatPolicy} policy LavaMoat policy
 * @param {string | URL} policyPath Filepath used as the base for resolving each
 *   `use` entry.
 * @returns {Promise<string[]>} Deduped Capability File source texts, in the
 *   order they are first encountered while iterating `policy.use`.
 * @public
 */
export const loadCapabilitySources = async (policy, policyPath) => {
  const use = policy.use ?? []
  if (use.length === 0) {
    return []
  }

  const baseURL =
    typeof policyPath === 'string' ? pathToFileURL(policyPath) : policyPath

  /**
   * Maps absolute Capability File path → source text. `Map` preserves insertion
   * order, giving us a stable, deduped sequence of sources.
   *
   * @type {Map<string, string>}
   */
  const fileToSource = new Map()

  for (const specifier of use) {
    const moduleURL = new URL(specifier, baseURL)

    /** @type {Record<string, unknown>} */
    let moduleNamespace
    try {
      moduleNamespace = await import(moduleURL.href)
    } catch (err) {
      throw new Error(
        `LavaMoat: failed to load Capability Module '${specifier}': ${
          err instanceof Error ? err.message : String(err)
        }`,
        { cause: err }
      )
    }

    const entries = /** @type {CapabilityIndex[]} */ (moduleNamespace.default)
    if (!Array.isArray(entries)) {
      throw new TypeError(
        `LavaMoat: Capability Module '${specifier}' must have a default export of an array of { names, file } entries`
      )
    }

    for (const entry of entries) {
      if (
        !entry ||
        typeof entry !== 'object' ||
        !Array.isArray(entry.names) ||
        typeof entry.file !== 'string'
      ) {
        throw new TypeError(
          `LavaMoat: Capability Module '${specifier}' default export entries must be { names: string[], file: string }`
        )
      }

      // Resolve the file path relative to the Capability Module's own
      // location so authors can write `file: './cap-impl.js'`. Absolute
      // paths (including those produced by `require.resolve` or
      // `import.meta.dirname + '/x.js'`) are kept as-is. If the Capability
      // Module isn't on disk (e.g. a `data:` URL), there is no meaningful
      // base directory, so `file` must be absolute.
      let absFile
      if (path.isAbsolute(entry.file)) {
        absFile = entry.file
      } else if (moduleURL.protocol === 'file:') {
        const moduleDir = path.dirname(fileURLToPath(moduleURL))
        absFile = path.resolve(moduleDir, entry.file)
      } else {
        throw new TypeError(
          `LavaMoat: Capability Module '${specifier}' is loaded from a non-file URL; its 'file' paths must be absolute (got '${entry.file}')`
        )
      }

      if (fileToSource.has(absFile)) {
        continue
      }

      let source
      try {
        source = await readFile(absFile, 'utf8')
      } catch (err) {
        throw new Error(
          `LavaMoat: failed to read Capability File '${entry.file}' (from Capability Module '${specifier}'): ${
            err instanceof Error ? err.message : String(err)
          }`,
          { cause: err }
        )
      }
      fileToSource.set(absFile, source)
    }
  }

  return [...fileToSource.values()]
}
