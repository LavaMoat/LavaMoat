// @ts-check

const fs = require('fs')
const { mergePolicy } = require('./mergePolicy')
const jsonStringify = require('json-stable-stringify')

module.exports = { loadPolicy, loadPolicyAndApplyOverrides }

/**
 *
 * @param {PolicyOpts} opts
 * @returns {Promise<unknown>}
 */
async function readPolicyFile({ debugMode, policyPath }) {
  if (debugMode) {
    console.warn(`Lavamoat looking for policy at'${policyPath}'`)
  }
  const configSource = fs.readFileSync(policyPath, 'utf8')
  return JSON.parse(configSource)
}

/**
 *
 * @param {PolicyOpts} opts
 * @returns {Promise<unknown|import('./schema').LavaMoatPolicy>}
 */
async function loadPolicy({ debugMode, policyPath }) {
  /** @type {import('./schema').LavaMoatPolicy|unknown} */
  let policy = { resources: {} }
  if (fs.existsSync(policyPath)) {
    policy = readPolicyFile({ debugMode, policyPath })
  } else {
    if (debugMode) {
      console.warn(`Lavamoat could not find policy at '${policyPath}'`)
    }
  }
  return policy
}

/**
 *
 * @param {PolicyOpts & {policyOverridePath: string}} opts
 * @returns
 */
async function loadPolicyAndApplyOverrides({
  debugMode,
  policyPath,
  policyOverridePath,
}) {
  const policy = await loadPolicy({ debugMode, policyPath })
  let lavamoatPolicy = policy
  if (fs.existsSync(policyOverridePath)) {
    if (debugMode) {
      console.warn('Merging policy-override.json into policy.json')
    }
    const policyOverride = await readPolicyFile({
      debugMode,
      policyPath: policyOverridePath,
    })
    lavamoatPolicy = mergePolicy(policy, policyOverride)
    // TODO: Only write if merge results in changes.
    // Would have to make a deep equal check on whole policy, which is a waste of time.
    // mergePolicy() should be able to do it in one pass.
    fs.writeFileSync(policyPath, jsonStringify(lavamoatPolicy, { space: 2 }))
  }
  return lavamoatPolicy
}

/**
 * @typedef PolicyOpts
 * @property {boolean} debugMode
 * @property {string} policyPath
 */
