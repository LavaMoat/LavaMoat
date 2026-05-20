/**
 * Provides {@link execute}, which is a lower-level API for application
 * execution.
 *
 * Import via `@lavamoat/node/execute` to bypass SES initialization and
 * `lockdown()`.
 *
 * @packageDocumentation
 */

import { load } from './load.js'
import { log as defaultLog } from '../log.js'
import { seconds } from '../format.js'

/**
 * @import {
 *   ApplicationLoader,
 *   ExecuteOptions
 * } from "../types.js"
 */

/**
 * Lower-level API for application execution
 *
 * - Knows nothing about LavaMoat policy (bring your own attenuator!)
 * - Supports native modules, Node.js builtins
 * - Evasive transforms applied by default
 * - Consumer has full control over `importLocation` options
 *
 * See `run()` for a higher-level API
 *
 * @template [T=unknown] Exports of module, if known. Default is `unknown`
 * @param {string | URL} entrypointPath Entry point of application
 * @param {ExecuteOptions} [options] Options
 * @returns {Promise<T>} Exports of executed module
 * @public
 */

export const execute = async (entrypointPath, options = {}) => {
  const { log = defaultLog } = options
  const startTime = Date.now()
  const application = /** @type {ApplicationLoader<T>} */ (
    await load(entrypointPath, options)
  )
  const duration = (Date.now() - startTime) / 1000
  log.debug(`Loaded application in ${seconds(duration)}s`)
  const { namespace } = await application.import()
  return namespace
}
