/**
 * Provides {@link run}, which is the highest-level public API for code
 * execution.
 *
 * @packageDocumentation
 */
import { makeReadPowers } from '../compartment/power.js'
import { DEFAULT_ATTENUATOR } from '../constants.js'
import { TrustMismatchError } from '../error.js'
import { toEndoPolicy } from '../policy-converter.js'
import { isTrusted } from '../policy-util.js'
import { devToConditions, hrPath } from '../util.js'
import { attenuateModule, makeGlobalsAttenuator } from './default-attenuator.js'
import { makeExecutionCompartment } from './exec-compartment-class.js'
import { execute } from './execute.js'

/**
 * @import {LavaMoatPolicy} from 'lavamoat-core'
 * @import {RunOptions} from '../types.js';
 */

/**
 * Runs a module or script with provided LavaMoat policy
 *
 * Allows creation of read powers from raw interfaces; see {@link makeReadPowers}
 *
 * @privateRemarks
 * Mainly a wrapper around {@link execute}
 *
 * TODO: Should accept `policy` or `policyPath`.
 * @template [T=unknown] Exports of module, if known. Default is `unknown`
 * @param {string | URL} entrypoint Entry point of application
 * @param {LavaMoatPolicy} policy LavaMoat policy
 * @param {RunOptions} [options] Options
 * @returns {Promise<T>} Exports of executed module
 */

export const run = async (
  entrypoint,
  policy,
  { dev = false, policyOverridePath, trustRoot, projectRoot, ...options } = {}
) => {
  await Promise.resolve()
  if (trustRoot && !isTrusted(policy)) {
    throw new TrustMismatchError(
      `Attempted to run entrypoint ${hrPath(entrypoint)} with full privileges, but entry policy is untrusted. Aborting`
    )
  }
  const readPowers = makeReadPowers(options)

  const endoPolicy = await toEndoPolicy(policy, {
    projectRoot,
    policyOverridePath,
  })

  return execute(entrypoint, readPowers, {
    Compartment: makeExecutionCompartment(globalThis),
    modules: {
      [DEFAULT_ATTENUATOR]: {
        attenuateGlobals: makeGlobalsAttenuator({ policy }),
        attenuateModule,
      },
    },
    policy: endoPolicy,
    conditions: devToConditions(dev),
  })
}
