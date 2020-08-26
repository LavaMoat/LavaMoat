const { createModuleInspector } = require('./generateConfig')
const { walk } = require('./walk')

module.exports = { parseForConfig }

async function parseForConfig ({
  moduleSpecifier,
  importHook,
  isBuiltin,
  shouldImport,
  includeDebugInfo,
  inspector = createModuleInspector({ isBuiltin, includeDebugInfo })
}) {
  await walk({ moduleSpecifier, importHook, visitorFn, shouldImport })
  // after all modules, submit config
  const config = inspector.generateConfig()
  // console.log(JSON.stringify(config, null, 2))
  return config

  function visitorFn (moduleRecord) {
    // inspect each module
    inspector.inspectModule(moduleRecord)
  }
}
