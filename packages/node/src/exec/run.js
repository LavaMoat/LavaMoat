/**
 * Provides {@link run}, which is the highest-level public API for code
 * execution.
 *
 * @packageDocumentation
 */
import nodeFs from 'node:fs'
import { makeReadPowers } from '../compartment/power.js'
import {
  DEFAULT_ATTENUATOR,
  DEFAULT_TRUST_ROOT_COMPARTMENT,
} from '../constants.js'
import { TrustMismatchError } from '../error.js'
import { hrCode, hrPath } from '../format.js'
import { log as defaultLog } from '../log.js'
import { toEndoPolicy } from '../policy-converter.js'
import { isTrusted, loadPolicies } from '../policy-util.js'
import { attenuateModule, makeGlobalsAttenuator } from './default-attenuator.js'
import { makeExecutionCompartment } from './exec-compartment-class.js'
import { execute } from './execute.js'

/**
 * @import {LavaMoatPolicy} from '@lavamoat/types'
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
  // this must be done against the merged policy, not the original.
  assertTrustRootMatchesPolicy(policy, entrypoint, trustRoot)

  /** @type {ExecuteOptions} */
  const executeOptions = {
    Compartment: makeExecutionCompartment(globalThis),
    modules: {
      [DEFAULT_ATTENUATOR]: {
        attenuateGlobals: makeGlobalsAttenuator({
          policy,
          scuttleGlobalThis: options.scuttleGlobalThis,
        }),
        attenuateModule,
      },
    },
    policy: endoPolicy,
    dev,
    log,
    readPowers: makeReadPowers(options),
  }

  return execute(entrypoint, executeOptions)
}

/**
 * Asserts the value of `trustRoot` matches that returned by {@link isTrusted}
 * when run against `policy`
 *
 * @remarks
 * This only makes sense prior to execution.
 * @param {LavaMoatPolicy} policy LavaMoat policy
 * @param {string | URL} entrypoint Path to entry point (for error message)
 * @param {boolean} trustRoot Whether we plan to trust the root environment
 */
const assertTrustRootMatchesPolicy = (
  policy,
  entrypoint,
  trustRoot = DEFAULT_TRUST_ROOT_COMPARTMENT
) => {
  if (trustRoot && !isTrusted(policy)) {
    throw new TrustMismatchError(
      `Attempted to execute entrypoint ${hrPath(entrypoint)} as trusted, but policy expects an untrusted root. Either call ${hrCode('run()')} with option ${hrCode('{trustRoot: true}')} or provide a policy which trusts the root (without ${hrCode('root.usePolicy')}). Aborting`
    )
  } else if (!trustRoot && isTrusted(policy)) {
    throw new TrustMismatchError(
      `Attempted to execute entrypoint ${hrPath(entrypoint)} as untrusted, but policy expects a trusted root. Either call ${hrCode('run()')} with option ${hrCode('{trustRoot: false}')} or provide a policy which does not trust the root. Aborting`
    )
  }
}
