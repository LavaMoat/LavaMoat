/**
 * Provides {@link execute}, which is a lower-level API for application
 * execution.
 *
 * Import via `@lavamoat/node/execute` to bypass SES initialization and
 * `lockdown()`.
 *
 * @packageDocumentation
 */

import { importLocation } from '@endo/compartment-mapper'
import { DEFAULT_ENDO_OPTIONS } from './compartment-map.js'
import { makeExecutionCompartment } from './execution-compartment.js'
import { toURLString } from './util.js'

/**
 * @import {ReadNowPowers} from '@endo/compartment-mapper'
 * @import {ExecuteOptions} from './types.js'
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
 * @param {ReadNowPowers} readPowers Read powers
 * @param {ExecuteOptions} [options] Options
 * @returns {Promise<T>} Exports of executed module
 * @public
 */

export const execute = async (entrypointPath, readPowers, options) => {
  const entrypoint = toURLString(entrypointPath)
  const { namespace } = await importLocation(readPowers, entrypoint, {
    ...DEFAULT_ENDO_OPTIONS,
    Compartment: makeExecutionCompartment(globalThis),
    ...options,
  })
  return namespace
}
