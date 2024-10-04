/**
 * Utilities for reading and validating LavaMoat policies.
 *
 * **All exports in this module are considered part of the public API.**
 *
 * @packageDocumentation
 */

import { mergePolicy } from 'lavamoat-core'
import { fileURLToPath } from 'node:url'
import * as constants from './constants.js'
import { readJsonFile } from './util.js'

/**
 * @import {LavaMoatPolicy, LavaMoatPolicyOverrides} from 'lavamoat-core'
 */

/**
 * Reads a `policy.json` from disk
 *
 * @param {string | URL} [filepath]
 * @returns {Promise<unknown>}
 * @internal
 */
const readPolicy = async (filepath = constants.DEFAULT_POLICY_PATH) => {
  return readJsonFile(
    filepath instanceof URL ? fileURLToPath(filepath) : filepath
  )
}

/**
 * Reads a `policy-override.json` from disk, if any.
 *
 * @param {string | URL} [filepath]
 * @returns {Promise<unknown | undefined>}
 * @throws If reading the policy fails in a way other than the file not existing
 */
export const readPolicyOverride = async (
  filepath = constants.DEFAULT_POLICY_OVERRIDE_PATH
) => {
  await Promise.resolve() // eslint
  try {
    return await readPolicy(filepath)
  } catch (err) {
    if (/** @type {NodeJS.ErrnoException} */ (err).code !== 'ENOENT') {
      throw err
    }
  }
}

/**
 * Reads a policy and policy override from disk and merges them into a single
 * policy.
 *
 * @privateRemarks
 * The way this fails is not user-friendly; it will just throw a `TypeError`
 * saying that the policy is invalid. **We should use proper schema validation**
 * to provide a more helpful error message. TODO
 * @param {string} [policyPath] Path to `policy.json`
 * @param {string} [policyOverridePath] Path to `policy-override.json`
 * @returns {Promise<LavaMoatPolicy>}
 * @throws If a policy is invalid _and/or_ if policy overrides were provided and
 *   are invalid
 * @public
 */
export const loadPolicies = async (
  policyPath = constants.DEFAULT_POLICY_PATH,
  policyOverridePath = constants.DEFAULT_POLICY_OVERRIDE_PATH
) => {
  const policies = await Promise.all([
    readPolicy(policyPath).then((allegedPolicy) => {
      assertPolicy(allegedPolicy)
      return allegedPolicy
    }),
    readPolicyOverride(policyOverridePath).then((allegedPolicyOverride) => {
      if (allegedPolicyOverride) {
        assertPolicyOverride(allegedPolicyOverride)
        return allegedPolicyOverride
      }
    }),
  ])

  return mergePolicy(...policies)
}

/**
 * Type predicate for a {@link LavaMoatPolicy}
 *
 * @param {unknown} value Value to check
 * @returns {value is LavaMoatPolicy} Whether the value is a `LavaMoatPolicy`
 * @public
 */
export const isPolicy = (value) => {
  return !!(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    (('resources' in value && value.resources) ||
      ('resolutions' in value && value.resolutions))
  )
}

/**
 * Type predicate for a {@link LavaMoatPolicyOverrides}
 *
 * @param {unknown} value
 * @returns {value is LavaMoatPolicyOverrides}
 */
export const isPolicyOverride = (value) => {
  return isPolicy(value)
}

/**
 * Assertion for a {@link LavaMoatPolicy}
 *
 * @param {unknown} value
 * @returns {asserts value is LavaMoatPolicy}
 */
export const assertPolicy = (value) => {
  if (!isPolicy(value)) {
    // TODO: need an object validator lib
    throw new TypeError('Invalid LavaMoat policy')
  }
}

/**
 * Assertion for a {@link LavaMoatPolicyOverrides}
 *
 * @param {unknown} value
 * @returns {asserts value is LavaMoatPolicyOverrides}
 */
export const assertPolicyOverride = (value) => {
  if (!isPolicyOverride(value)) {
    throw new TypeError('Invalid LavaMoat policy overrides')
  }
}
