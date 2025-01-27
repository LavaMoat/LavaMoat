/**
 * Provides {@link run}, which is the highest-level public API for code
 * execution.
 *
 * @packageDocumentation
 */

import { makeReadPowers } from '../compartment/power.js'
import { DEFAULT_ATTENUATOR } from '../constants.js'
import { toEndoPolicySync } from '../policy-converter.js'
import { devToConditions } from '../util.js'
import { attenuateModule, makeGlobalsAttenuator } from './default-attenuator.js'
import { makeExecutionCompartment } from './exec-compartment-class.js'
import { execute } from './execute.js'

/**
 * @import {LavaMoatPolicy} from '@lavamoat/types'
 * @import {RunOptions} from '../types.js';
 */

/**
 * Runs a module or script with provided LavaMoat policy
 *
 * Allows creation of read powers from raw interfaces; see {@link makeReadPowers}
 *
 * @privateRemarks
 * Mainly a wrapper around {@link execute}
 * @template [T=unknown] Exports of module, if known. Default is `unknown`
 * @param {string | URL} entrypointPath Entry point of application
 * @param {LavaMoatPolicy} policy LavaMoat policy
 * @param {RunOptions} [options] Options
 * @returns {Promise<T>} Exports of executed module
 */

export const run = async (
  entrypointPath,
  policy,
  { dev = true, policyOverride, ...options } = {}
) => {
  await Promise.resolve()
  const readPowers = makeReadPowers(options)
  const endoPolicy = toEndoPolicySync(policy, policyOverride)

  return execute(entrypointPath, readPowers, {
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
