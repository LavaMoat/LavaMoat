const { createModuleInspector } = require('./generatePolicy')
const { eachNodeInTree } = require('./walk')

module.exports = { parseForPolicy }

/**
 * @function parseForPolicy
 * @param {object} options
 * @param {string} options.moduleSpecifier
 * @param {function} options.isBuiltin
 * @param {function} options.shouldImport
 * @param {object} options.policyOverride
 * @param {bool} options.includeDebugInfo
 * @param {ModuleInspector} options.inspector
 * @returns {JSON} policy object
 */
async function parseForPolicy ({
  moduleSpecifier,
  importHook,
  isBuiltin,
  shouldImport,
  policyOverride,
  includeDebugInfo,
  inspector = createModuleInspector({ isBuiltin, includeDebugInfo })
}) {
  for await (const moduleRecord of eachNodeInTree({ moduleSpecifier, importHook, shouldImport })) {
    // inspect each module
    inspector.inspectModule(moduleRecord)
  }
  // after all modules, submit policy
  const policy = inspector.generatePolicy({ policyOverride })
  return policy
}
