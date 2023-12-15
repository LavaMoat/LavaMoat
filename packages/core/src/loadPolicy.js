// @ts-check

const fs = require('node:fs/promises')
const { mergePolicy } = require('./mergePolicy')
const jsonStringify = require('json-stable-stringify')

module.exports = { loadPolicy, loadPolicyAndApplyOverrides }

/**
 * Reads a policy file from disk, if present
 *
 * @param {PolicyOpts} opts
 * @returns {Promise<import('./schema').LavaMoatPolicy|undefined>}
 */
async function readPolicyFile({ debugMode, policyPath }) {
  if (debugMode) {
    console.warn(`Lavamoat looking for policy at '${policyPath}'`)
  }
  try {
    const rawPolicy = await fs.readFile(policyPath, 'utf8')
    return JSON.parse(rawPolicy)
  } catch (err) {
    if (/** @type {NodeJS.ErrnoException} */ (err).code !== 'ENOENT') {
      throw err
    } else if (debugMode) {
      console.warn(`Lavamoat could not find policy at '${policyPath}'`)
    }
  }
}

/**
 * Loads a policy from disk, returning a default empty policy if not found.
 *
 * @todo Because there is no validation taking place, the resulting value could be literally anything `JSON.parse()` could return. Also note that this returns a `LavaMoatPolicy` when we could be asking for a `LavaMoatPolicyOverrides`; make your type assertions accordingly!
 * @param {PolicyOpts} opts
 * @returns {Promise<import('./schema').LavaMoatPolicy>}
 */
async function loadPolicy({ debugMode, policyPath }) {
  /** @type {import('./schema').LavaMoatPolicy} */
  let policy = { resources: {} }
  try {
    const rawPolicy = await readPolicyFile({ debugMode, policyPath })
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
 * @param {PolicyOpts & {policyOverridePath: string}} opts
 * @returns {Promise<import('./schema').LavaMoatPolicy>}
 */
async function loadPolicyAndApplyOverrides({
  debugMode,
  policyPath,
  policyOverridePath,
}) {
  const policy = await loadPolicy({ debugMode, policyPath })

  const policyOverride =
    /** @type {import('./schema').LavaMoatPolicyOverrides|undefined} */ (
      await readPolicyFile({ debugMode, policyPath: policyOverridePath })
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
  await fs.writeFile(policyPath, jsonStringify(finalPolicy, { space: 2 }))

  return finalPolicy
}

/**
 * @typedef PolicyOpts
 * @property {boolean} debugMode
 * @property {string} policyPath
 */
