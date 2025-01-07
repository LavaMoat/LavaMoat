/**
 * Provides {@link execute}, which is a lower-level API for application
 * execution.
 *
 * Import via `@lavamoat/node/execute` to bypass SES initialization and
 * `lockdown()`.
 *
 * @packageDocumentation
 */

import { loadLocation } from '@endo/compartment-mapper'
import { DEFAULT_ENDO_OPTIONS } from './compartment-map.js'
import { makeExecutionCompartment } from './execution-compartment.js'
import { defaultReadPowers } from './power.js'
import { isReadNowPowers, toURLString } from './util.js'

/**
 * @import {ReadNowPowers} from '@endo/compartment-mapper'
 * @import {ApplicationLoader, ExecuteOptions} from './types.js'
 */

/**
 * Lower-level API for application execution
 *
 * - Knows nothing about LavaMoat policy (bring your own attenuator!)
 * - Supports native modules, Node.js builtins
 * - Applies corrections to compartment `globalThis` values, including `Date` and
 *   `Math` globals
 * - Evasive transforms applied by default
 * - Consumer has full control over `importLocation` options
 *
 * See `run()` for a higher-level API
 *
 * @template [T=unknown] Exports of module, if known. Default is `unknown`
 * @overload
 * @param {string | URL} entrypointPath Entry point of application
 * @param {ReadNowPowers} [readPowers] Read powers
 * @param {ExecuteOptions} [options] Options
 * @returns {Promise<T>} Exports of executed module
 * @public
 */

/**
 * Lower-level API for application execution
 *
 * - Knows nothing about LavaMoat policy (bring your own attenuator!)
 * - Supports native modules, Node.js builtins
 * - Applies corrections to compartment `globalThis` values, including `Date` and
 *   `Math` globals
 * - Evasive transforms applied by default
 * - Consumer has full control over `importLocation` options
 *
 * See `run()` for a higher-level API
 *
 * @template [T=unknown] Exports of module, if known. Default is `unknown`
 * @overload
 * @param {string | URL} entrypointPath Entry point of application
 * @param {ExecuteOptions} [options] Options
 * @returns {Promise<T>} Exports of executed module
 * @public
 */

/**
 * Lower-level API for application execution
 *
 * - Knows nothing about LavaMoat policy (bring your own attenuator!)
 * - Supports native modules, Node.js builtins
 * - Applies corrections to compartment `globalThis` values, including `Date` and
 *   `Math` globals
 * - Evasive transforms applied by default
 * - Consumer has full control over `importLocation` options
 *
 * See `run()` for a higher-level API
 *
 * @template [T=unknown] Exports of module, if known. Default is `unknown`
 * @param {string | URL} entrypointPath Entry point of application
 * @param {ReadNowPowers | ExecuteOptions} [powersOrOptions] Read powers
 * @param {ExecuteOptions} [options] Options
 * @returns {Promise<T>} Exports of executed module
 * @public
 */

export const execute = async (entrypointPath, powersOrOptions, options) => {
  /** @type {ReadNowPowers} */
  let readNowPowers
  if (isReadNowPowers(powersOrOptions)) {
    readNowPowers = powersOrOptions
  } else {
    readNowPowers = defaultReadPowers
    options = powersOrOptions
  }

  const application = /** @type {ApplicationLoader<T>} */ (
    await load(entrypointPath, readNowPowers, options)
  )
  const { namespace } = await application.import()
  return namespace
}

/**
 * Loads an application without executing it.
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
  options
) => {
  const entrypoint = toURLString(entrypointPath)
  const opts = {
    ...DEFAULT_ENDO_OPTIONS,
    Compartment: makeExecutionCompartment(globalThis),
    ...options,
  }
  const { import: importApp, sha512 } = await loadLocation(
    readPowers,
    entrypoint,
    opts
  )
  return {
    // TODO: update Endo's type here
    import: () => /** @type {Promise<{ namespace: T }>} */ (importApp(opts)),
    sha512,
  }
}
