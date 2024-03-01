import { mergePolicy } from 'lavamoat-core'
import { fileURLToPath } from 'node:url'
import * as constants from './constants.js'
import { readJsonFile } from './util.js'

/**
 * Reads a `policy.json` from disk
 *
 * @param {string | URL} [filepath]
 * @returns {Promise<import('lavamoat-core').LavaMoatPolicy>}
 */
export async function readPolicy(filepath = constants.DEFAULT_POLICY_PATH) {
  return readJsonFile(
    filepath instanceof URL ? fileURLToPath(filepath) : filepath
  )
}

/**
 * Reads a `policy-override.json` from disk
 *
 * @param {string | URL} [filepath]
 * @returns {Promise<
 *   import('lavamoat-core').LavaMoatPolicyOverrides | undefined
 * >}
 */
export async function readPolicyOverride(
  filepath = constants.DEFAULT_POLICY_OVERRIDE_PATH
) {
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
 * @param {string} [policyPath]
 * @param {string} [policyOverridePath]
 * @returns {Promise<import('lavamoat-core').LavaMoatPolicy>}
 */
export async function loadPolicies(
  policyPath = constants.DEFAULT_POLICY_PATH,
  policyOverridePath = constants.DEFAULT_POLICY_OVERRIDE_PATH
) {
  const policies = await Promise.all([
    readPolicy(policyPath).then((allegedPolicy) => {
      assertPolicy(allegedPolicy)
      return allegedPolicy
    }),
    readPolicyOverride(policyOverridePath).then((allegedPolicy) => {
      return allegedPolicy
    }),
  ])

  return mergePolicy(...policies)
}

/**
 * Type guard for a `LavaMoatPolicy`
 *
 * @param {unknown} value
 * @returns {value is import('lavamoat-core').LavaMoatPolicy}
 */
export function isPolicy(value) {
  return Boolean(
    value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      (('resources' in value && value.resources) ||
        ('resolutions' in value && value.resolutions))
  )
}

/**
 * Type guard for a `LavaMoatPolicyOverrides`
 *
 * @param {unknown} value
 * @returns {value is import('lavamoat-core').LavaMoatPolicyOverrides}
 */
export function isPolicyOverride(value) {
  return isPolicy(value)
}

/**
 * Assertion for a `LavaMoatPolicy`
 *
 * @param {unknown} value
 * @returns {asserts value is import('lavamoat-core').LavaMoatPolicy}
 */
export function assertPolicy(value) {
  if (!isPolicy(value)) {
    // TODO: need an object validator lib
    throw new TypeError('Invalid LavaMoat policy')
  }
}

/**
 * Assertion for a `LavaMoatPolicyOverrides`
 *
 * @param {unknown} value
 * @returns {asserts value is import('lavamoat-core').LavaMoatPolicyOverrides}
 */
export function assertPolicyOverride(value) {
  if (!isPolicyOverride(value)) {
    throw new TypeError('Invalid LavaMoat override policy')
  }
}
