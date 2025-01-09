/**
 * Provides {@link load}, which only loads a compartment map.
 *
 * Import via `@lavamoat/node/load` to bypass SES initialization and
 * `lockdown()`.
 *
 * @packageDocumentation
 */

import { loadLocation } from '@endo/compartment-mapper'
import { DEFAULT_ENDO_OPTIONS } from '../compartment/options.js'
import { defaultReadPowers } from '../compartment/power.js'
import { toURLString } from '../util.js'

/**
 * @import {ReadNowPowers, LoadLocationOptions} from '@endo/compartment-mapper'
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
  options = {}
) => {
  await Promise.resolve()

  const entrypoint = toURLString(entrypointPath)

  /** @type {LoadLocationOptions} */
  const opts = {
    ...DEFAULT_ENDO_OPTIONS,
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
