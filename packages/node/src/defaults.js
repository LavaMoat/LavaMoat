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
 * @property {LavaMoatScuttleOpts} [scuttleGlobalThis]
 * @property {string[]} [scuttleGlobalThisExceptions]
 * @property {boolean} [writeAutoPolicy]
 * @property {boolean} [writeAutoPolicyDebug]
 * @property {boolean} [writeAutoPolicyAndRun]
 * @property {string} [policyPath]
 * @property {string} [policyDebugPath]
 * @property {string} [policyOverridePath]
 * @property {string} [projectRoot]
 * @property {boolean} [debugMode]
 * @property {boolean} [statsMode]
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
