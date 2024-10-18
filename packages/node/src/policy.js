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
export const readPolicy = async (filepath = constants.DEFAULT_POLICY_PATH) => {
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
  try {
    // eslint-disable-next-line @jessie.js/safe-await-separator
    return await readPolicy(filepath)
  } catch (err) {
    if (/** @type {NodeJS.ErrnoException} */ (err).code !== 'ENOENT') {
      throw err
    }
  }
}

/**
 * Reads a policy and policy override from object or disk and merges them into a
 * single policy.
 *
 * @privateRemarks
 * TODO: The way this fails is not user-friendly; it will just throw a
 * `TypeError` saying that the policy is invalid. **We should use proper schema
 * validation** to provide a more helpful error message.
 * @param {string | URL | LavaMoatPolicy} [policy] Path to `policy.json` or the
 *   policy itself. Defaults to `./lavamoat/node/policy.json` relative to the
 *   current working directory.
 * @param {string | URL | LavaMoatPolicyOverrides} [policyOverride] Path to
 *   `policy-override.json` or the policy override itself. Defaults to
 *   `./lavamoat/node/policy-override.json` relative to the current working
 *   directory.
 * @returns {Promise<LavaMoatPolicy>}
 * @throws If a policy is invalid _and/or_ if policy overrides were provided
 *   _and_ are invalid
 * @public
 */
export const loadPolicies = async (
  policy = constants.DEFAULT_POLICY_PATH,
  policyOverride = constants.DEFAULT_POLICY_OVERRIDE_PATH
) => {
  /**
   * @type {[
   *   Promise<LavaMoatPolicy>,
   *   Promise<LavaMoatPolicyOverrides | undefined>,
   * ]}
   */
  const promises = /** @type {any} */ ([])
  if (typeof policy === 'object') {
    promises.push(
      Promise.resolve().then(() => {
        assertPolicy(policy)
        return policy
      })
    )
  } else {
    promises.push(
      readPolicy(policy).then((allegedPolicy) => {
        assertPolicy(allegedPolicy)
        return allegedPolicy
      })
    )
  }
  if (typeof policyOverride === 'object') {
    promises.push(
      Promise.resolve().then(() => {
        assertPolicyOverride(policyOverride)
        return policyOverride
      })
    )
  } else {
    promises.push(
      readPolicyOverride(policyOverride).then((allegedPolicyOverride) => {
        if (allegedPolicyOverride) {
          assertPolicyOverride(allegedPolicyOverride)
          return allegedPolicyOverride
        }
      })
    )
  }

  const policies = await Promise.all(promises)

  return mergePolicy(...policies)
}

/**
 * Type predicate for a {@link LavaMoatPolicy}
 *
 * @remarks
 * This is non-exhaustive and should eventually be replaced with a proper
 * schema.
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
 * Type predicate for a **non-empty** {@link LavaMoatPolicyOverrides}
 *
 * @remarks
 * See {@link isPolicy} for caveats
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
