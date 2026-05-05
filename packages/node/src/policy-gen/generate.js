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
import { InvalidArgumentsError } from '../error.js'
import { action, hrPath } from '../format.js'
import { log as defaultLog } from '../log.js'
import {
  makeDefaultPolicyOverridePath,
  makeDefaultPolicyPath,
  maybeReadPolicyOverride,
} from '../policy-util.js'
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
    policyPath: rawPolicyPath,
    policyOverridePath: rawPolicyOverridePath,
    policyOverride,
    readPowers = defaultReadPowers,
    readFile = nodeFs.promises.readFile,
    log = defaultLog,
    trustRoot = DEFAULT_TRUST_ROOT_COMPARTMENT,
    projectRoot: rawProjectRootPath = process.cwd(),
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

  /** @type {string} */
  let policyPath
  if (rawPolicyPath) {
    policyPath = toAbsolutePath(
      rawPolicyPath,
      `Policy path must be an absolute path; got ${hrPath(rawPolicyPath)}`
    )
    log.debug(`Resolved provided policy path: ${hrPath(policyPath)}`)
  } else {
    policyPath = makeDefaultPolicyPath(projectRoot)
  }

  /** @type {string | undefined} */
  let policyOverridePath
  // the user may specify a policy override or a path to a policy override.
  // in this case, we handle the path.
  if (!policyOverride) {
    if (rawPolicyOverridePath) {
      policyOverridePath = toAbsolutePath(
        rawPolicyOverridePath,
        `Policy override path must be an absolute path; got ${hrPath(rawPolicyOverridePath)}`
      )
      log.debug(
        `Resolved provided policy override path: ${hrPath(policyOverridePath)}`
      )
    } else {
      policyOverridePath = makeDefaultPolicyOverridePath({
        policyPath,
        projectRoot,
      })
    }
    policyOverride = await maybeReadPolicyOverride(policyOverridePath, {
      readFile,
    })
  } else if (rawPolicyOverridePath) {
    throw new InvalidArgumentsError(
      `Ignoring user-provided policy override path ${hrPath(rawPolicyOverridePath)} because a policy override object was provided`
    )
  }

  const niceEntrypointPath = hrPath(entrypointPath)

  log.info(
    `${action('Generating')} LavaMoat policy from ${niceEntrypointPath}…`
  )
  const { policy, hasWarnings } = await loadAndGeneratePolicy(entrypointPath, {
    ...generateOpts,
    trustRoot,
    readPowers,
    policyOverride,
    projectRoot,
  })

  return { policy, hasWarnings }
}
