/**
 * Provides {@link load}, which only loads a compartment map.
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
import { log as defaultLog } from '../log.js'
import { noop } from '../util.js'

/**
 * @import {ReadNowPowers, ImportLocationOptions, SyncImportLocationOptions} from '@endo/compartment-mapper'
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
  {
    log = defaultLog,
    dev,
    decorators = [],
    trustRoot,
    policy,
    readPowers = defaultReadPowers,
    onNodeModulesMapped = noop,
    ...otherOptions
  } = {}
) => {
  const { nodeCompartmentMap } = await makeNodeCompartmentMap(entrypointPath, {
    readPowers,
    dev,
    log,
    trustRoot,
    decorators: decorators,
    policy,
  })

  try {
    onNodeModulesMapped(nodeCompartmentMap, nodeDataMap)
  } catch (err) {
    log.error(`${err.message}:\n${err.stack}`)
    throw new ExecutionError(`onNodeModulesMapped callback failed`, {
      cause: err,
    })
  }

  /** @type {ImportLocationOptions | SyncImportLocationOptions} */
  const loadFromMapOptions = {
    ...DEFAULT_ENDO_OPTIONS,
    ...options,
    dev,
    policy,
    log: log.debug.bind(log),
  }

  const { import: importApp, sha512 } = await loadFromMap(
    readPowers,
    nodeCompartmentMap,
    loadFromMapOptions
  )

  return {
    // TODO: update Endo's type here
    import: () =>
      /** @type {Promise<{ namespace: T }>} */ (importApp(loadFromMapOptions)),
    sha512,
  }
}
