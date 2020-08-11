const through = require('through2')
const { createModuleInspector, LavamoatModuleRecord } = require('lavamoat-core')

module.exports = { createModuleInspectorSpy }

// createModuleInspectorSpy creates a pass-through object stream for the Browserify pipeline.
// it analyses modules for global namespace usages, and generates a config for LavaMoat.
// it calls `onResult` with the config when the stream ends.

function createModuleInspectorSpy ({ onResult, isBuiltin, includeDebugInfo }) {
  if (!isBuiltin) throw new Error('createModuleInspectorSpy - must specify "isBuiltin"')
  const inspector = createModuleInspector({ isBuiltin, includeDebugInfo })
  const configSpy = createSpy(
    // inspect each module
    (moduleData) => inspectBrowserifyModuleData(moduleData, inspector),
    // after all modules, submit config
    () => onResult(inspector.generateConfig())
  )
  return configSpy
}

// convert browserify/module-deps's internal ModuleData schema to LavamoatModuleRecord
function inspectBrowserifyModuleData (moduleData, inspector) {
  const moduleRecord = new LavamoatModuleRecord({
    specifier: moduleData.id,
    file: moduleData.file,
    packageName: moduleData.packageName,
    packageVersion: moduleData.packageVersion,
    content: moduleData.source,
    // browserify only deals with commonjs modules
    type: 'js',
    importMap: moduleData.deps,
    // likely undefined
    ast: moduleData.ast
  })
  inspector.inspectModule(moduleRecord)
}

// a passthrough stream with handlers for observing the data
function createSpy (onData, onEnd) {
  return through.obj((data, _, cb) => {
    // give data to observer fn
    try {
      onData(data)
    } catch (err) {
      return cb(err)
    }
    // pass the data through normally
    cb(null, data)
  }, (cb) => {
    // call flush observer
    try {
      onEnd()
    } catch (err) {
      return cb(err)
    }
    // End as normal
    cb()
  })
}
