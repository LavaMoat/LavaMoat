/**
 * Provides {@link run}, which is the highest-level public API for code
 * execution.
 *
 * @packageDocumentation
 */
import nodeFs from 'node:fs'
import { makeReadPowers } from '../compartment/power.js'
import { DEFAULT_ATTENUATOR } from '../constants.js'
import { log as defaultLog } from '../log.js'
import { toEndoPolicy } from '../policy-converter.js'
import { loadPolicy, policyInput } from '../policy-input.js'
import { assertTrustRootMatchesPolicy, unwrapMerged } from '../policy-util.js'
import { makeAttenuators } from './default-attenuator.js'
import { makeExecutionCompartment } from './exec-compartment-class.js'
import { execute } from './execute.js'

/**
 * @import {
 *   LoadOptions,
 *   RunOptions
 * } from '../types.js'
 */

/**
 * Runs a module or script with provided LavaMoat policy
 *
 * Allows creation of read powers from raw interfaces; see {@link makeReadPowers}
 *
 * @privateRemarks
 * Mainly a wrapper around {@link execute}
 * @template [T=unknown] Exports of module, if known. Default is `unknown`
 * @param {string | URL} entrypoint Entry point of application
 * @param {RunOptions} [options] Options
 * @returns {Promise<T>} Exports of executed module
 */
export const run = async (
  entrypoint,
  {
    prodOnly = false,
    trustRoot,
    projectRoot,
    readFile = nodeFs.promises.readFile,
    log = defaultLog,
    scuttleGlobalThis,
    policies,
    ...readPowerOpts
  } = {}
) => {
  await Promise.resolve()

  const input = policies ?? policyInput({ projectRoot })
  const merged = await loadPolicy(input, { readFile })

  assertTrustRootMatchesPolicy(merged, entrypoint, trustRoot)
  const policy = unwrapMerged(merged)
  const endoPolicy = await toEndoPolicy(merged)

  const { attenuateGlobals, attenuateModule } = makeAttenuators({
    policy,
    scuttleGlobalThis,
    trustRoot,
  })

  /** @type {LoadOptions} */
  const loadOptions = {
    Compartment: makeExecutionCompartment(globalThis),
    modules: {
      // We are passing the default attenuator in as an exit module. It's not required
      // for it to be a package then, but if we have a prototype pollution or RCE
      // in the attenuator, we're exposing the outside instead of the attenuators
      // compartment. It's a tradeoff. We could address it by manually creating a separate
      // compartment for defining the attenuator in.
      [DEFAULT_ATTENUATOR]: {
        attenuateGlobals,
        attenuateModule,
      },
    },
    endoPolicy,
    prodOnly,
    log,
    readPowers: makeReadPowers(readPowerOpts),
    trustRoot,
    policy,
  }

  return execute(entrypoint, loadOptions)
}
