/**
 * Utilities for reading and validating LavaMoat policies.
 *
 * **All exports in this module are considered part of the public API.**
 *
 * @packageDocumentation
 */

import { jsonStringifySortedPolicy, mergePolicy } from 'lavamoat-core'
import nodeFs from 'node:fs'
import nodePath from 'node:path'
import * as constants from './constants.js'
import { InvalidPolicyError } from './error.js'
import { readJsonFile } from './fs.js'
import { hasValue, isObject, isObjectyObject, isString } from './util.js'

/**
 * @import {RootPolicy, LavaMoatPolicy, LavaMoatPolicyOverrides, LavaMoatPolicyDebug} from 'lavamoat-core'
 * @import {WritableFsInterface} from './types.js'
 * @import {WithFs} from './internal.js'
 */

const { create } = Object

/**
 * Reads a `policy.json` from disk
 *
 * @overload
 * @param {string | URL} filepath Path to policy
 * @param {WithFs} [options] Options
 * @returns {Promise<LavaMoatPolicy>}
 * @internal
 */

/**
 * Reads a `policy.json` at the default policy path from disk
 *
 * @overload
 * @param {WithFs} [options] Options
 * @returns {Promise<LavaMoatPolicy>}
 * @internal
 */

/**
 * Reads a `policy.json` from disk
 *
 * @param {string | URL | WithFs} [filepath] Path to policy
 * @param {WithFs} [options] Options
 * @returns {Promise<LavaMoatPolicy>}
 * @internal
 */
export const readPolicy = async (
  filepath = constants.DEFAULT_POLICY_PATH,
  { fs = nodeFs } = {}
) => {
  /** @type {string | URL} */
  let policyPath
  if (!isString(filepath) && !(filepath instanceof URL)) {
    ;({ fs = nodeFs } = filepath)
    policyPath = constants.DEFAULT_POLICY_PATH
  } else {
    policyPath = filepath
  }
  const allegedPolicy = await readJsonFile(policyPath, { fs })
  assertPolicy(allegedPolicy)
  return allegedPolicy
}

/**
 * Reads a `policy-override.json` from disk, if any.
 *
 * @overload
 * @param {string | URL} filepath Path to policy override
 * @param {WithFs} [options] Options
 * @returns {Promise<LavaMoatPolicyOverrides | undefined>}
 * @throws If reading the policy fails in a way other than the file not existing
 */

/**
 * Reads a `policy-override.json` from disk at the default path, if any.
 *
 * @overload
 * @param {WithFs} [options] Options
 * @returns {Promise<LavaMoatPolicyOverrides | undefined>}
 * @throws If reading the policy fails in a way other than the file not existing
 */

/**
 * Reads a `policy-override.json` from disk, if any.
 *
 * @param {string | URL} [filepath]
 * @param {WithFs} [options]
 * @returns {Promise<LavaMoatPolicyOverrides | undefined>}
 * @throws If reading the policy fails in a way other than the file not existing
 */
export const readPolicyOverride = async (
  filepath = constants.DEFAULT_POLICY_OVERRIDE_PATH,
  { fs = nodeFs } = {}
) => {
  /** @type {string | URL} */
  let policyOverridePath
  if (!isString(filepath) && !(filepath instanceof URL)) {
    ;({ fs = nodeFs } = filepath)
    policyOverridePath = constants.DEFAULT_POLICY_OVERRIDE_PATH
  } else {
    policyOverridePath = filepath
  }
  try {
    // eslint-disable-next-line @jessie.js/safe-await-separator
    const allegedPolicy = await readJsonFile(policyOverridePath, { fs })
    assertPolicyOverride(allegedPolicy)
    return allegedPolicy
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
 * @param {WithFs} [options] Options
 * @returns {Promise<LavaMoatPolicy>}
 * @throws If a policy is invalid _and/or_ if policy overrides were provided
 *   _and_ are invalid
 * @public
 */
export const loadPolicies = async (
  policy = constants.DEFAULT_POLICY_PATH,
  policyOverride = constants.DEFAULT_POLICY_OVERRIDE_PATH,
  { fs = nodeFs } = {}
) => {
  /**
   * @type {[
   *   Promise<LavaMoatPolicy>,
   *   Promise<LavaMoatPolicyOverrides | undefined>,
   * ]}
   */
  const promises = /** @type {any} */ ([])
  if (isObject(policy)) {
    promises.push(
      Promise.resolve().then(() => {
        assertPolicy(policy)
        return policy
      })
    )
  } else {
    promises.push(readPolicy(policy, { fs }))
  }
  if (isObject(policyOverride)) {
    promises.push(
      Promise.resolve().then(() => {
        assertPolicyOverride(policyOverride)
        return policyOverride
      })
    )
  } else {
    promises.push(readPolicyOverride(policyOverride, { fs }))
  }

  /**
   * This type is only here for documentation purposes and is not needed
   *
   * @type {[LavaMoatPolicy, LavaMoatPolicyOverrides | undefined]}
   */
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
  return (
    isObjectyObject(value) &&
    (hasValue(value, 'resources') || hasValue(value, 'resolutions')) &&
    (!('root' in value) || isObjectyObject(value.root))
  )
}

/**
 * Type predicate for a {@link LavaMoatPolicyOverrides}
 *
 * @remarks
 * See {@link isPolicy} for caveats
 * @param {unknown} value
 * @returns {value is LavaMoatPolicyOverrides}
 */
export const isPolicyOverride = (value) => {
  if (isObjectyObject(value)) {
    return isPolicy({ resources: create(null), ...value })
  }
  return false
}

/**
 * Assertion for a {@link LavaMoatPolicy}
 *
 * @param {unknown} value
 * @returns {asserts value is LavaMoatPolicy}
 */
export const assertPolicy = (value) => {
  if (!isPolicy(value)) {
    throw new InvalidPolicyError('Invalid LavaMoat policy', { type: 'policy' })
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
    throw new InvalidPolicyError('Invalid LavaMoat policy overrides', {
      type: 'policy-override',
    })
  }
}

/**
 * Writes a diff-friendly LavaMoat policy to file
 *
 * Creates the destination directory if it does not exist
 *
 * @param {string} filepath Path to write to
 * @param {LavaMoatPolicy | LavaMoatPolicyDebug | LavaMoatPolicyOverrides} policy
 *   Any policy
 * @param {{ fs?: WritableFsInterface }} opts Options
 * @returns {Promise<void>}
 * @internal
 */
export const writePolicy = async (filepath, policy, { fs = nodeFs } = {}) => {
  await fs.promises.mkdir(nodePath.dirname(filepath), { recursive: true })
  await fs.promises.writeFile(filepath, jsonStringifySortedPolicy(policy))
}

/**
 * Returns `true` if there is no such
 * {@link RootPolicy.usePolicy `root.usePolicy`} field.
 *
 * @param {LavaMoatPolicy} policy
 * @returns {boolean}
 * @internal
 */
export const isTrusted = (policy) => {
  return !policy.root?.usePolicy
}
