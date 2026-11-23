// @ts-check

const { readFileSync } = require('node:fs')
const { mergePolicy } = require('./mergePolicy')

module.exports = { loadPolicy, loadPolicyAndApplyOverrides, loadPoliciesSync }

/**
 * @import {LavaMoatPolicy} from '@lavamoat/types'
 */

/**
 * Reads a policy file from disk, if present
 *
 * @param {PolicyOpts} opts
 * @returns {LavaMoatPolicy | undefined}
 */
function readPolicyFileSync({ debugMode, policyPath }) {
  if (debugMode) {
    console.warn(`Lavamoat looking for policy at '${policyPath}'`)
  }
  /** @type string */
  let rawPolicy
  try {
    rawPolicy = readFileSync(policyPath, 'utf8')
  } catch (err) {
    if (/** @type {NodeJS.ErrnoException} */ (err).code !== 'ENOENT') {
      throw err
    } else if (debugMode) {
      console.warn(`Lavamoat could not find policy at '${policyPath}'`)
    }
    return
  }
  try {
    return JSON.parse(rawPolicy)
  } catch (/** @type any */ error) {
    if (debugMode) {
      console.warn({
        error: error?.message || error,
        policyPath,
        rawPolicy,
      })
    }
    throw new Error(
      `Lavamoat could not parse policy at '${policyPath}': ${/** @type {NodeJS.ErrnoException} */ (error).message}`
    )
  }
}

/**
 * Loads a policy from disk, returning a default empty policy if not found.
 *
 * @param {PolicyOpts} opts
 * @returns {Promise<LavaMoatPolicy>}
 * @todo Because there is no validation taking place, the resulting value could
 *   be literally anything `JSON.parse()` could return. We do no validation
 *   here, and we should.
 */
async function loadPolicy({ debugMode, policyPath }) {
  /** @type {LavaMoatPolicy} */
  let policy = { resources: {} }
  try {
    const rawPolicy = readPolicyFileSync({ debugMode, policyPath })
    policy = rawPolicy ?? policy
  } catch (err) {
    if (/** @type {NodeJS.ErrnoException} */ (err).code !== 'ENOENT') {
      throw err
    } else if (debugMode) {
      console.warn(`Lavamoat could not find policy at '${policyPath}'`)
    }
  }
  return policy
}

/**
 * Checks if all resources from overrides exist in policy
 *
 * @param {LavaMoatPolicy} policy
 * @param {LavaMoatPolicy} override
 * @returns {boolean}
 */
const wasOverrideIncluded = (policy, override) => {
  // all keys from override.resources exist in policy.resources
  if (!override.resources) {
    return true
  }
  if (!policy.resources) {
    return false
  }
  return Object.keys(override.resources).every((key) =>
    Object.hasOwn(policy.resources, key)
  )
}

/**
 * Loads policy and policy overrides from disk and merges them.
 *
 * Warns if new overrides are detected.
 *
 * @param {PolicyOpts & { policyOverridePath: string }} opts
 * @returns {Promise<LavaMoatPolicy>}
 */
async function loadPolicyAndApplyOverrides({
  debugMode,
  policyPath,
  policyOverridePath,
}) {
  const policy = await loadPolicy({ debugMode, policyPath })

  const policyOverride = readPolicyFileSync({
    debugMode,
    policyPath: policyOverridePath,
  })

  if (!policyOverride) {
    return policy
  }

  if (debugMode) {
    console.warn('Merging policy-override.json into policy.json')
  }

  const finalPolicy = mergePolicy(policy, policyOverride)

  // If overrides contain resources that were not included, it's possible that policy generation could use them to detect new items.
  if (!wasOverrideIncluded(policy, policyOverride)) {
    console.warn(
      'LavaMoat: A new policy override was added since the policy was last generated. Please run policy generation again to make sure all is up to date.'
    )
  }

  return finalPolicy
}

/**
 * Loads policy and policy overrides from disk and merges them.
 *
 * Doesn't write anything back to disk.
 *
 * @param {PolicyOpts & { policyOverridePath: string }} opts
 * @returns {{
 *   policy: LavaMoatPolicy | undefined
 *   applyOverride: (main: LavaMoatPolicy) => LavaMoatPolicy
 * }}
 */
function loadPoliciesSync({ debugMode, policyPath, policyOverridePath }) {
  const policy = readPolicyFileSync({ debugMode, policyPath })
  const policyOverride = readPolicyFileSync({
    debugMode,
    policyPath: policyOverridePath,
  })

  return {
    policy,
    applyOverride: (main) => {
      if (!policyOverride) {
        return main
      }
      if (debugMode) {
        console.warn('Merging policy-override.json into policy.json')
      }
      return mergePolicy(main, policyOverride)
    },
  }
}

/**
 * @typedef PolicyOpts
 * @property {boolean} debugMode
 * @property {string} policyPath
 */
