/**
 * Provides Lavamoat policy generation facilities via {@link generatePolicy}
 *
 * **All exports in this module are considered part of the public API.**
 *
 * @packageDocumentation
 */
import nodeFs from 'node:fs'
import { defaultReadPowers } from '../compartment/power.js'
import { DEFAULT_TRUST_ROOT_COMPARTMENT } from '../constants.js'
import { hrPath } from '../format.js'
import { action } from '../format.js'
import { log as defaultLog } from '../log.js'
import { policyInput, resolvePolicySources } from '../policy-input.js'
import { maybeReadPolicyOverride } from '../policy-util.js'
import { toAbsolutePath } from '../util.js'
import { loadAndGeneratePolicy } from './load-for-policy.js'

/**
 * @import {
 *   GeneratePolicyOptions,
 *   GeneratePolicyResult
 * } from '../types.js'
 */

/**
 * Generates a LavaMoat policy from a given entry point using
 * `@endo/compartment-mapper`
 *
 * @param {string | URL} entrypoint
 * @param {GeneratePolicyOptions} [opts]
 * @returns {Promise<GeneratePolicyResult>}
 * @public
 */
export const generatePolicy = async (
  entrypoint,
  {
    policies,
    readPowers = defaultReadPowers,
    readFile = nodeFs.promises.readFile,
    log = defaultLog,
    trustRoot = DEFAULT_TRUST_ROOT_COMPARTMENT,
    projectRoot: rawProjectRootPath = process.cwd(),
    compact,
    ...generateOpts
  } = {}
) => {
  await Promise.resolve()

  const entrypointPath = toAbsolutePath(
    entrypoint,
    `Entrypoint must be an absolute path; got ${hrPath(entrypoint)}`
  )
  const projectRoot = toAbsolutePath(
    rawProjectRootPath,
    `Project root must be an absolute path; got ${hrPath(rawProjectRootPath)}`
  )

  const input = policies ?? policyInput({ projectRoot })
  const { policyPath: policyPath, overridePath } = resolvePolicySources(input)

  if (policyPath) {
    log.debug(`Resolved policy path: ${hrPath(policyPath)}`)
  }

  /**
   * Whether the policy override was loaded from disk by this function (as
   * opposed to being passed in by the caller as an object). Only when it was
   * loaded here do we honour `compact` and propagate `policyOverridePath`.
   */
  let overrideLoadedFromDisk = false
  /** @type {import('@lavamoat/types').LavaMoatPolicy | undefined} */
  let resolvedPolicyOverride

  if (input.override.kind === 'inline') {
    resolvedPolicyOverride = input.override.policy
  } else if (
    (input.override.kind === 'file' || input.override.kind === 'auto') &&
    overridePath
  ) {
    if (input.override.kind === 'file') {
      log.debug(
        `Resolved provided policy override path: ${hrPath(overridePath)}`
      )
    }
    resolvedPolicyOverride = await maybeReadPolicyOverride(overridePath, {
      readFile,
    })
    overrideLoadedFromDisk = resolvedPolicyOverride !== undefined
    if (overrideLoadedFromDisk && input.override.kind === 'auto') {
      log.info(`Discovered policy override file at ${hrPath(overridePath)}`)
    }
  }

  const niceEntrypointPath = hrPath(entrypointPath)

  log.info(
    `${action('Generating')} LavaMoat policy from ${niceEntrypointPath}…`
  )
  const { policy, hasWarnings, compactedPolicyOverride } =
    await loadAndGeneratePolicy(entrypointPath, {
      ...generateOpts,
      trustRoot,
      readPowers,
      policyOverride: resolvedPolicyOverride,
      projectRoot,
      compact: overrideLoadedFromDisk ? compact : undefined,
    })

  return {
    policy,
    hasWarnings,
    compactedPolicyOverride,
    policyOverridePath: overrideLoadedFromDisk ? overridePath : undefined,
  }
}
