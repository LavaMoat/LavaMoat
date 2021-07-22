const fs = require('fs')
const { mergePolicy } = require('./mergePolicy')

module.exports = { loadPolicy }


async function loadPolicy ({ debugMode, policyPath, policyOverridePath }) {
  let policy = { resources: {} }
  // try policy
  if (fs.existsSync(policyPath)) {
    if (debugMode) console.warn(`Lavamoat looking for policy at ${policyPath}`)
    const configSource = fs.readFileSync(policyPath, 'utf8')
    policy = JSON.parse(configSource)
  } else {
    if (debugMode) console.warn('Lavamoat could not find policy')
  }
  // try policy override
  if (fs.existsSync(policyOverridePath)) {
    if (debugMode) console.warn(`Lavamoat looking for override policy at ${policyOverridePath}`)
    const configSource = fs.readFileSync(policyOverridePath, 'utf8')
    const overrideConfig = JSON.parse(configSource)
    policy = mergePolicy(policy, overrideConfig)
  } else {
    if (debugMode) console.warn('Lavamoat could not find policy override')
  }
  return policy
}
