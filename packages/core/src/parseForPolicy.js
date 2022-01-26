const { createModuleInspector } = require('./generatePolicy')
const { walk } = require('./walk')

module.exports = { parseForPolicy }

async function parseForPolicy ({
  moduleSpecifier,
  importHook,
  isBuiltin,
  shouldImport,
  includeDebugInfo,
  policyOverride,
  inspector = createModuleInspector({ isBuiltin, includeDebugInfo })
}) {
  await walk({ moduleSpecifier, importHook, visitorFn, shouldImport })
  // after all modules, submit policy
  const policy = inspector.generatePolicy({ policyOverride })
  return policy

  function visitorFn (moduleRecord) {
    // inspect each module
    inspector.inspectModule(moduleRecord)
  }
}
