const fs = require('fs')

module.exports = { loadPolicy }


async function loadPolicy ({ debugMode, policyPath }) {
  let policy = { resources: {} }
  // try policy
  if (fs.existsSync(policyPath)) {
    if (debugMode) console.warn(`Lavamoat looking for policy at ${policyPath}`)
    const configSource = fs.readFileSync(policyPath, 'utf8')
    policy = JSON.parse(configSource)
  } else {
    if (debugMode) console.warn(`Lavamoat could not find policy at ${policyPath}`)
  }
  return policy
}
