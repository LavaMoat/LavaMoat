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
import { harden } from '../preamble.js'
import { loadCapabilitySources, readCapabilitySources } from './capabilities.js'
import { makeAttenuators } from './default-attenuator.js'
import { makeExecutionCompartment } from './exec-compartment-class.js'
import { execute } from './execute.js'

/**
 * @import {ExecuteOptions,
 *   LoadPoliciesOptions,
 *   MergedLavaMoatPolicy,
 *   RunOptions} from '../types.js'
 * @import {CapabilityIndex, LavaMoatPolicy} from '@lavamoat/types'
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
    capabilitySources = [],
    capabilityIndices = [],
    strictHarden = false,
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
    policyPath: options.policyPath,
    policyOverride: options.policyOverride,
    policyOverridePath: options.policyOverridePath,
  }

  const policy = await loadPolicies(
    options.policy ?? options.policyPath,
    loadPoliciesOptions
  )

  // because we have a merged policy, we don't need to provide overrides to `toEndoPolicy`
  const endoPolicy = await toEndoPolicy(policy, { projectRoot })

  assertTrustRootMatchesPolicy(policy, entrypoint, trustRoot)

  capabilitySources = await prepareCapabilitySources(policy, {
    capabilitySources,
    capabilityIndices,
    policyPath: options.policyPath,
  })

  const { capabilities } = harden({ capabilitySources, strict: strictHarden })

  const { attenuateGlobals, attenuateModule } = makeAttenuators({
    policy,
    scuttleGlobalThis,
    trustRoot,
    capabilities,
  })

  /** @type {ExecuteOptions} */
  const executeOptions = {
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
    readPowers: makeReadPowers(options),
    trustRoot,
    policy,
  }

  return execute(entrypoint, executeOptions)
}

/**
 * Asserts the value of `trustRoot` matches that returned by {@link isTrusted}
 * when run against `policy`
 *
 * @remarks
 * This only makes sense prior to execution.
 * @param {MergedLavaMoatPolicy} policy LavaMoat policy
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

/**
 * Reads or loads Capability Files depending on input.
 *
 * {@link policyPath} is **required** for this function to do anything useful.
 *
 * Capability Files are only loaded from policy's `use` field if both
 * {@link capabilityIndices} and {@link capabilitySources} are empty; this is to
 * avoid loading the same Capability Files twice. Practically speaking, this
 * means that `policy.use` is _ignored_ if either of the other two options are
 * provided.
 *
 * @param {LavaMoatPolicy} policy Policy
 * @param {Object} options Options
 * @param {Iterable<string>} [options.capabilitySources] List of JS source
 *   strings for Capability Files
 * @param {Iterable<CapabilityIndex | CapabilityIndex[]>} [options.capabilityIndices]
 *   List of pre-imported Capability File modules
 * @param {string | URL} [options.policyPath] Policy path; **if omitted, an
 *   empty array is returned**
 * @returns {Promise<string[]>} List of Capability File source strings
 */
const prepareCapabilitySources = async (
  policy,
  { policyPath, capabilitySources = [], capabilityIndices = [] } = {}
) => {
  let capabilitySourcesArr = [...capabilitySources]
  // We can only load capability sources if we have a policy path, because the
  // policy references them relative to itself.
  if (!policyPath) {
    return capabilitySourcesArr
  }
  capabilitySourcesArr = [
    ...capabilitySourcesArr,
    ...(await readCapabilitySources(capabilityIndices, policyPath)),
    ...(policy.use?.length &&
    ![...capabilityIndices].length &&
    !capabilitySourcesArr.length
      ? await loadCapabilitySources(policy, policyPath)
      : []),
  ]

  return capabilitySourcesArr
}
