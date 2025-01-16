// @ts-check

const { createModuleInspector } = require('./generatePolicy')
const { eachNodeInTree } = require('./walk')

module.exports = { parseForPolicy }

/**
 * @import {LavaMoatPolicy, DefaultModuleInitArgs, LavaMoatPolicyOverrides, LavamoatModuleRecord} from '@lavamoat/types'
 * @import {ModuleInspector} from './generatePolicy'
 */

/**
 * @param {ParseForPolicyOpts} opts
 * @returns {Promise<LavaMoatPolicy>} Policy object
 */
async function parseForPolicy({
  moduleSpecifier,
  importHook,
  isBuiltin,
  shouldImport,
  policyOverride,
  includeDebugInfo,
  inspector = createModuleInspector({ isBuiltin, includeDebugInfo }),
}) {
  for await (const moduleRecord of eachNodeInTree({
    moduleSpecifier,
    importHook,
    shouldImport,
  })) {
    // inspect each module
    inspector.inspectModule(moduleRecord)
  }
  // after all modules, submit policy
  const policy = inspector.generatePolicy({ policyOverride })
  return policy
}

/**
 * @template {any[]} [InitArgs=DefaultModuleInitArgs] Default is
 *   `DefaultModuleInitArgs`
 * @callback ImportHookFn
 * @param {string} address
 * @returns {Promise<LavamoatModuleRecord<InitArgs>>}
 */

/**
 * @callback IsBuiltinFn
 * @param {string} specifier
 * @returns {boolean}
 */

/**
 * @callback ShouldImportFn
 * @param {string} childSpecifier
 * @param {string} moduleSpecifier
 * @returns {boolean}
 */

/**
 * @callback ResolveFn
 * @param {string} requestedName
 * @param {string} parentAddress
 * @returns {string | null}
 */

/**
 * @template {any[]} [InitArgs=DefaultModuleInitArgs] Default is
 *   `DefaultModuleInitArgs`
 * @typedef ParseForPolicyOpts
 * @property {string} moduleSpecifier
 * @property {ImportHookFn<InitArgs>} importHook
 * @property {IsBuiltinFn} isBuiltin
 * @property {ShouldImportFn} [shouldImport]
 * @property {ResolveFn} [resolveHook]
 * @property {LavaMoatPolicyOverrides} [policyOverride]
 * @property {boolean} [includeDebugInfo]
 * @property {ModuleInspector} [inspector]
 */

/**
 * @param {ParseForPolicyOpts} opts
 * @returns {Promise<LavaMoatPolicySchema>} Policy object
 */
