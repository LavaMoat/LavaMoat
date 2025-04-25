/**
 * Provides {@link load}, which only loads a compartment map.
 *
 * Import via `@lavamoat/node/load` to bypass SES initialization and
 * `lockdown()`.
 *
 * @packageDocumentation
 */

import { loadFromMap } from '@endo/compartment-mapper/import-lite.js'
import { mapNodeModules } from '@endo/compartment-mapper/node-modules.js'
import {
  applyTransforms,
  finalCompartmentDescriptorTransform,
} from '../compartment/compartment-descriptor-transform.js'
import { DEFAULT_ENDO_OPTIONS } from '../compartment/options.js'
import { defaultReadPowers } from '../compartment/power.js'
import { log as defaultLog } from '../log.js'
import { toEndoURL } from '../util.js'

/**
 * @import {ReadNowPowers, LoadLocationOptions, ImportLocationOptions, SyncImportLocationOptions} from '@endo/compartment-mapper'
 * @import {ApplicationLoader, ExecuteOptions} from '../types.js'
 */

/**
 * Low-level API for loading a compartment map for an application without
 * executing it.
 *
 * Use cases:
 *
 * - {@link ApplicationLoader.sha512 hash validation} of the compartment map
 * - Other as-of-yet-unknown things
 *
 * @template [T=unknown] Exports of module, if known. Default is `unknown`
 * @param {string | URL} entrypointPath Entry point of application
 * @param {ReadNowPowers} [readPowers] Read powers
 * @param {ExecuteOptions} [options] Options
 * @returns {Promise<ApplicationLoader<T>>} Object with `import()` method
 * @public
 */
export const load = async (
  entrypointPath,
  readPowers = defaultReadPowers,
  {
    log = defaultLog,
    dev,
    compartmentDescriptorTransforms = [],
    trustRoot,
    policy,
    ...options
  } = {}
) => {
  const conditions = new Set(['node'])
  await Promise.resolve()

  const entrypoint = toEndoURL(entrypointPath)

  const compartmentMap = await mapNodeModules(readPowers, entrypoint, {
    conditions,
    dev,
    policy,
    languageForExtension: DEFAULT_ENDO_OPTIONS.languageForExtension,
  })

  compartmentDescriptorTransforms.push(finalCompartmentDescriptorTransform)

  applyTransforms(compartmentDescriptorTransforms, compartmentMap, {
    trustRoot,
    log,
  })

  /** @type {ImportLocationOptions | SyncImportLocationOptions} */
  const opts = {
    ...DEFAULT_ENDO_OPTIONS,
    ...options,
    dev,
    policy,
    log: log.debug.bind(log),
  }

  const { import: importApp, sha512 } = await loadFromMap(
    readPowers,
    compartmentMap,
    opts
  )

  return {
    // TODO: update Endo's type here
    import: () => /** @type {Promise<{ namespace: T }>} */ (importApp(opts)),
    sha512,
  }
}
