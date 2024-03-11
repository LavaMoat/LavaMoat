const { getDefaultPaths } = require('lavamoat-core')

const defaultPaths = getDefaultPaths('node')

/**
 * @typedef LavaMoatScuttleOpts
 * @property {boolean} [enabled]
 * @property {string[]} [exceptions]
 * @property {string} [scuttlerName]
 */

/**
 * @typedef LavaMoatOpts
 * @property {LavaMoatScuttleOpts} [scuttleGlobalThis] Enable or disable
 *   scuttling of `globalThis`
 * @property {string[]} [scuttleGlobalThisExceptions]
 * @property {boolean} [writeAutoPolicy] Automatically write a policy file
 * @property {boolean} [writeAutoPolicyDebug] Automatically write a debug policy
 *   file
 * @property {boolean} [writeAutoPolicyAndRun] Automatically write a policy file
 *   and run the application
 * @property {string} [policyPath] Path to policy file
 * @property {string} [policyDebugPath] Path to policy debug file
 * @property {string} [policyOverridePath] Path to policy override file
 * @property {string} [projectRoot] Path to project root
 * @property {boolean} [debugMode] Enable debug mode
 * @property {boolean} [statsMode] Enable stats mode
 */

/** @type {LavaMoatOpts} */
const defaults = {
  scuttleGlobalThis: {},
  scuttleGlobalThisExceptions: [],
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

module.exports = defaults
