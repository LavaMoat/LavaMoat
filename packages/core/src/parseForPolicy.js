const { createModuleInspector } = require('./generatePolicy')
const { walk } = require('./walk')

module.exports = { parseForPolicy }

async function parseForPolicy ({
  moduleSpecifier,
  importHook,
  isBuiltin,
  shouldImport,
  includeDebugInfo,
  inspector = createModuleInspector({ isBuiltin, includeDebugInfo })
}) {
  await walk({ moduleSpecifier, importHook, visitorFn, shouldImport })
  // after all modules, submit config
  const config = inspector.generatePolicy()
  // console.log(JSON.stringify(config, null, 2))
  return config

  function visitorFn (moduleRecord) {
    // inspect each module
    inspector.inspectModule(moduleRecord)
  }
}
