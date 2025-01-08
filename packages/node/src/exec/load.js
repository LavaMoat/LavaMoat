/**
 * Provides {@link load}, which only loads a compartment map.
 *
 * Import via `@lavamoat/node/load` to bypass SES initialization and
 * `lockdown()`.
 *
 * @packageDocumentation
 */

import { DEFAULT_ENDO_OPTIONS } from '#compartment/options'
import { defaultReadPowers } from '#compartment/power'
import { DEFAULT_ATTENUATOR } from '#constants'
import { toURLString } from '#util'
import { loadLocation } from '@endo/compartment-mapper'
import { attenuateModule, makeGlobalsAttenuator } from './default-attenuator.js'
import { makeExecutionCompartment } from './exec-compartment-class.js'

/**
 * @import {ReadNowPowers} from '@endo/compartment-mapper'
 * @import {ApplicationLoader, ExecuteOptions} from '#types'
 */

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
  options = {}
) => {
  const entrypoint = toURLString(entrypointPath)
  const opts = {
    ...DEFAULT_ENDO_OPTIONS,
    Compartment: makeExecutionCompartment(globalThis),
    modules: {
      [DEFAULT_ATTENUATOR]: {
        attenuateGlobals: makeGlobalsAttenuator({ policy: options.policy }),
        attenuateModule,
      },
    },
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
