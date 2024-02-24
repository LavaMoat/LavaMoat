// @ts-check

const fs = require('node:fs/promises')
const { readFileSync } = require('node:fs')
const { mergePolicy } = require('./mergePolicy')
const { jsonStringifySortedPolicy } = require('./stringifyPolicy')

module.exports = { loadPolicy, loadPolicyAndApplyOverrides, loadPoliciesSync }

/**
 * Reads a policy file from disk, if present
 *
 * @param {PolicyOpts} opts
 * @returns {import('@lavamoat/types').LavaMoatPolicy | undefined}
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
 * @returns {Promise<import('@lavamoat/types').LavaMoatPolicy>}
 * @todo Because there is no validation taking place, the resulting value could
 *   be literally anything `JSON.parse()` could return. Also note that this
 *   returns a `LavaMoatPolicy` when we could be asking for a
 *   `LavaMoatPolicyOverrides`; make your type assertions accordingly!
 */
async function loadPolicy({ debugMode, policyPath }) {
  /** @type {import('@lavamoat/types').LavaMoatPolicy} */
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
 * Loads policy and policy overrides from disk and merges them.
 *
 * If overrides exist, writes the overrides _back_ into the policy file.
 *
 * @param {PolicyOpts & { policyOverridePath: string }} opts
 * @returns {Promise<import('@lavamoat/types').LavaMoatPolicy>}
 */
async function loadPolicyAndApplyOverrides({
  debugMode,
  policyPath,
  policyOverridePath,
}) {
  const policy = await loadPolicy({ debugMode, policyPath })

  const policyOverride =
    /** @type {import('@lavamoat/types').LavaMoatPolicyOverrides | undefined} */ (
      readPolicyFileSync({ debugMode, policyPath: policyOverridePath })
    )

  if (!policyOverride) {
    return policy
  }

  if (debugMode) {
    console.warn('Merging policy-override.json into policy.json')
  }

  const finalPolicy = mergePolicy(policy, policyOverride)

  // TODO: Only write if merge results in changes.
  // Would have to make a deep equal check on whole policy, which is a waste of time.
  // mergePolicy() should be able to do it in one pass.
  await fs.writeFile(policyPath, jsonStringifySortedPolicy(finalPolicy))

  return finalPolicy
}

/**
 * Loads policy and policy overrides from disk and merges them.
 *
 * Doesn't write anything back to disk.
 *
 * @param {PolicyOpts & { policyOverridePath: string }} opts
 * @returns {{
 *   policy: import('@lavamoat/types').LavaMoatPolicy | undefined
 *   applyOverride: (
 *     main: import('@lavamoat/types').LavaMoatPolicy
 *   ) => import('@lavamoat/types').LavaMoatPolicy
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
