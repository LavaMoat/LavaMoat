const { createModuleInspector } = require('./generateConfig')
const { walk } = require('./walk')

module.exports = { parseForConfig }

async function parseForConfig ({ moduleSpecifier, resolveHook, importHook, isBuiltin, shouldResolve, shouldImport }) {
  const inspector = createModuleInspector({ isBuiltin })
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
    package: moduleRecord.packageName,
    id: moduleRecord.specifier,
    type: moduleRecord.type,
    file: moduleRecord.specifier,
    source: moduleRecord.content,
    ast: moduleRecord.ast,
    deps: Object.fromEntries(moduleRecord.imports.map(requestedName => {
      let depValue
      if (shouldResolve(requestedName, moduleRecord.specifier)) {
        try {
          depValue = resolveHook(requestedName, moduleRecord.specifier)
        } catch (err) {
          // graceful failure
          console.warn(`moduleRecordToModuleData - could not resolve "${requestedName}" from "${moduleRecord.specifier}"`)
          depValue = requestedName
        }
      } else {
        // resolving is skipped so put in a dummy value
        depValue = requestedName
      }
      return [requestedName, depValue]
    }))
  }
}
