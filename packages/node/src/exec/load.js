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
import { ExecutionError } from '../error.js'
import { log as defaultLog } from '../log.js'
import { noop } from '../util.js'

/**
 * @import {ImportLocationOptions, SyncImportLocationOptions, CompartmentMapDescriptor, PackageCompartmentMapDescriptor} from '@endo/compartment-mapper'
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
 * @param {ExecuteOptions} [options] Options
 * @returns {Promise<ApplicationLoader<T>>} Object with `import()` method
 * @public
 */
export const load = async (
  entrypointPath,
  {
    log = defaultLog,
    dev,
    trustRoot,
    endoPolicy,
    readPowers = defaultReadPowers,
    onNodeModulesMapped = noop,
    ...otherOptions
  } = {}
) => {
  /** @type {PackageCompartmentMapDescriptor} */
  let nodeCompartmentMap

  try {
    // eslint-disable-next-line @jessie.js/safe-await-separator
    ;({ nodeCompartmentMap } = await makeNodeCompartmentMap(entrypointPath, {
      readPowers,
      dev,
      log,
      trustRoot,
      endoPolicy,
    }))
  } catch (err) {
    throw new ExecutionError(
      `Failed to create compartment map for ${entrypointPath}: ${err}`,
      { cause: err }
    )
  }

  try {
    onNodeModulesMapped(nodeCompartmentMap)
  } catch (err) {
    throw new ExecutionError(`onNodeModulesMapped callback failed`, {
      cause: err,
    })
  }

  /** @type {ImportLocationOptions | SyncImportLocationOptions} */
  const loadFromMapOptions = {
    ...DEFAULT_ENDO_OPTIONS,
    ...otherOptions,
    dev,
    policy: endoPolicy,
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
