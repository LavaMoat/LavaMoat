/**
 * Provides {@link load}, which only loads a compartment map and returns an
 * {@link ApplicationLoader} object.
 *
 * Import via `@lavamoat/node/load` to bypass SES initialization and
 * `lockdown()`.
 *
 * @packageDocumentation
 */

import { loadFromMap } from '@endo/compartment-mapper/import-lite.js'
import { makeNodeCompartmentMap } from '../compartment/node-compartment-map.js'
import { DEFAULT_ENDO_OPTIONS } from '../compartment/options.js'
import { defaultReadPowers } from '../compartment/power.js'
import { ExecutionError } from '../error.js'
import { log as defaultLog } from '../log.js'
import { reportInvalidCanonicalNames } from '../report.js'
import { importHook, importNowHook } from '../compartment/import-hook.js'
import { createExecParsers } from './exec-parsers.js'

/**
 * @import {
 *   CanonicalName,
 *   ImportLocationOptions,
 *   PackageCompartmentMapDescriptor,
 *   SyncImportLocationOptions
 * } from '@endo/compartment-mapper'
 * @import {
 *   ApplicationLoader,
 *   ExecuteOptions
 * } from '../types.js'
 */

/**
 * Low-level API for loading a compartment map for an application without
 * executing it.
 *
 * Use cases:
 *
 * - {@link ApplicationLoader.sha512 hash validation} of the compartment map
 * - Custom overrides for parsers and options to `@endo/compartment-mapper`'s
 *   `loadFromMap()`
 * - Other as-of-yet-unknown things
 *
 * @template [T=unknown] Exports of module, if known. Default is `unknown`
 * @param {string | URL} entrypointPath Entry point of application
 * @param {ExecuteOptions} [options] Options
 * @returns {Promise<ApplicationLoader<T>>} Object with `import()` method
 * @public
 */
export const load = async (
  entrypointPath,
  {
    log = defaultLog,
    prodOnly,
    trustRoot,
    endoPolicy,
    readPowers = defaultReadPowers,
    policy,
    ...otherOptions
  } = {}
) => {
  /** @type {PackageCompartmentMapDescriptor} */
  let packageCompartmentMap
  /** @type {Set<CanonicalName>} */
  let unknownCanonicalNames
  /** @type {Set<CanonicalName>} */
  let knownCanonicalNames

  try {
    ;({ packageCompartmentMap, unknownCanonicalNames, knownCanonicalNames } =
      await makeNodeCompartmentMap(entrypointPath, {
        readPowers,
        prodOnly,
        log,
        trustRoot,
        endoPolicy,
      }))
    // note: for execution, warnings are likely disabled by default, and this
    // function only prints warnings.
    reportInvalidCanonicalNames(unknownCanonicalNames, knownCanonicalNames, {
      policy,
      log,
      what: 'policy',
    })
  } catch (err) {
    throw new ExecutionError(
      `Failed to crawl packages for ${entrypointPath}: ${err}`,
      { cause: err }
    )
  }

  /** @type {ImportLocationOptions | SyncImportLocationOptions} */
  const loadFromMapOptions = {
    ...DEFAULT_ENDO_OPTIONS,
    importHook,
    importNowHook,
    ...otherOptions,
    parserForLanguage: {
      ...DEFAULT_ENDO_OPTIONS.parserForLanguage,
      ...otherOptions.parserForLanguage,
      ...createExecParsers(),
    },
    dev: !prodOnly,
    policy: endoPolicy,
    log: log.debug.bind(log),
  }

  const { import: importApp, sha512 } = await loadFromMap(
    readPowers,
    packageCompartmentMap,
    loadFromMapOptions
  )

  return {
    // TODO: update Endo's type here
    import: () =>
      /** @type {Promise<{ namespace: T }>} */ (importApp(loadFromMapOptions)),
    sha512,
  }
}
