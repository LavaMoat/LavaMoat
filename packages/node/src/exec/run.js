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
import { loadPolicies } from '../policy-util.js'
import { devToConditions } from '../util.js'
import { attenuateModule, makeGlobalsAttenuator } from './default-attenuator.js'
import { makeExecutionCompartment } from './exec-compartment-class.js'
import { execute } from './execute.js'

/**
 * @import {LavaMoatPolicy} from 'lavamoat-core'
 * @import {ExecuteOptions, LoadPoliciesOptions, RunOptions} from '../types.js';
 */

/**
 * Runs a module or script with provided LavaMoat policy
 *
 * Allows creation of read powers from raw interfaces; see {@link makeReadPowers}
 *
 * @template [T=unknown] Exports of module, if known. Default is `unknown`
 * @overload
 * @param {string | URL} entrypoint Entry point of application
 * @param {LavaMoatPolicy} policy LavaMoat policy
 * @param {RunOptions} [options] Options
 * @returns {Promise<T>} Exports of executed module
 */

/**
 * Runs a module or script with provided LavaMoat policy from a path
 *
 * Allows creation of read powers from raw interfaces; see {@link makeReadPowers}
 *
 * @template [T=unknown] Exports of module, if known. Default is `unknown`
 * @overload
 * @param {string | URL} entrypoint Entry point of application
 * @param {string | URL} policyPath Path to LavaMoat policy
 * @param {RunOptions} [options] Options
 * @returns {Promise<T>} Exports of executed module
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
 * @param {LavaMoatPolicy | string | URL} policyOrPolicyPath LavaMoat policy
 * @param {RunOptions} [options] Options
 * @returns {Promise<T>} Exports of executed module
 */
export const run = async (
  entrypoint,
  policyOrPolicyPath,
  {
    dev = false,
    trustRoot,
    projectRoot,
    readFile = nodeFs.promises.readFile,
    log = defaultLog,
    ...options
  } = {}
) => {
  await Promise.resolve()

  /**
   * @remarks
   * This is a typescript-ism.
   * @type {LoadPoliciesOptions}
   */
  const loadPoliciesOptions = {
    readFile,
    projectRoot,
    ...('policyOverride' in options
      ? {
          policyOverride: options.policyOverride,
        }
      : {
          policyOverridePath: options.policyOverridePath,
        }),
  }

  const policy = await loadPolicies(policyOrPolicyPath, loadPoliciesOptions)

  // because we have a merged policy, we don't need to provide overrides to `toEndoPolicy`
  const endoPolicy = await toEndoPolicy(policy, { projectRoot })

  /** @type {ExecuteOptions} */
  const executeOptions = {
    Compartment: makeExecutionCompartment(globalThis),
    modules: {
      [DEFAULT_ATTENUATOR]: {
        attenuateGlobals: makeGlobalsAttenuator({ policy }),
        attenuateModule,
      },
    },
    policy: endoPolicy,
    conditions: devToConditions(dev),
    log,
    readPowers: makeReadPowers(options),
  }

  return execute(entrypoint, executeOptions)
}
