import { mergePolicy as mergePolicies } from 'lavamoat-core'
import { fileURLToPath } from 'node:url'
import * as constants from './constants.js'
import { readJsonFile } from './util.js'

/**
 * Reads a `policy.json` from disk
 *
 * @param {string | URL} [filepath]
 * @returns {Promise<import('lavamoat-core').LavaMoatPolicy>}
 * @todo Validate
 */
export async function readPolicy(filepath = constants.DEFAULT_POLICY_PATH) {
  if (filepath instanceof URL) {
    filepath = fileURLToPath(filepath)
  }
  return readJsonFile(filepath)
}

/**
 * Reads a `policy-override.json` from disk
 *
 * @param {string | URL} [filepath]
 * @returns {Promise<
 *   import('lavamoat-core').LavaMoatPolicyOverrides | undefined
 * >}
 * @todo Validate
 */
export async function readPolicyOverride(
  filepath = constants.DEFAULT_POLICY_OVERRIDE_PATH
) {
  await null // eslint
  try {
    return await readPolicy(filepath)
  } catch (err) {
    if (/** @type {NodeJS.ErrnoException} */ (err).code === 'ENOENT') {
      return undefined
    }
    throw err
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
    readPolicy(policyPath),
    readPolicyOverride(policyOverridePath),
  ])

  return mergePolicies(...policies)
}
