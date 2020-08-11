const { createModuleInspector } = require('./generateConfig')
const { walk } = require('./walk')

module.exports = { parseForConfig }

async function parseForConfig ({
  moduleSpecifier,
  resolveHook,
  importHook,
  isBuiltin,
  shouldResolve,
  shouldImport,
  includeDebugInfo
}) {
  const inspector = createModuleInspector({ isBuiltin, includeDebugInfo })
  await walk({ moduleSpecifier, resolveHook, importHook, visitorFn, shouldResolve, shouldImport })
  // after all modules, submit config
  const config = inspector.generateConfig()
  // console.log(JSON.stringify(config, null, 2))
  return config

  function visitorFn (moduleRecord) {
    // inspect each module
    inspector.inspectModule(moduleRecord)
  }
}
