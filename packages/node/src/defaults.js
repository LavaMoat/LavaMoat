const { getDefaultPaths } = require('lavamoat-core')

const defaultPaths = getDefaultPaths('node')

module.exports = {
  scuttleGlobalThis: {},
  writeAutoPolicy: false,
  writeAutoPolicyDebug: false,
  writeAutoPolicyAndRun: false,
  policyPath: defaultPaths.primary,
  policyDebugPath: defaultPaths.debug,
  policyOverridePath: defaultPaths.override,
  projectRoot: process.cwd(),
  debugMode: false,
  statsMode: false,
}
