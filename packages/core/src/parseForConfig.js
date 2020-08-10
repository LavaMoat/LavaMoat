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
  includeDebugInfo,
}) {
  const inspector = createModuleInspector({ isBuiltin, includeDebugInfo })
  await walk({ moduleSpecifier, resolveHook, importHook, visitorFn, shouldResolve, shouldImport })
  // after all modules, submit config
  const config = inspector.generateConfig()
  // console.log(JSON.stringify(config, null, 2))
  return config

  function visitorFn (moduleRecord) {
    // inspect each module
    const moduleData = moduleRecordToModuleData({ moduleRecord, shouldResolve, resolveHook })
    inspector.inspectModule(moduleData)
  }
}

// convert the LavamoatModuleRecord to the moduleData format derrived from browserify/module-deps
// primary differences is that `deps` includes resolved specifiers
function moduleRecordToModuleData ({
  moduleRecord,
  resolveHook,
  shouldResolve = () => true
}) {
  return {
    id: moduleRecord.specifier,
    file: moduleRecord.specifier,
    type: moduleRecord.type,
    source: moduleRecord.content,
    ast: moduleRecord.ast,
    deps: moduleRecord.importMap,
    package: moduleRecord.packageName,
    packageName: moduleRecord.packageName,
    packageVersion: moduleRecord.packageVersion,
  }
}
