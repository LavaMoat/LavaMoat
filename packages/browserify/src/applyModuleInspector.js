const { createModuleInspectorSpy } = require('./createModuleInspectorSpy.js')

module.exports = { applyModuleInspector }

function applyModuleInspector (browserify, opts = {}) {
  browserify.pipeline.get('emit-deps').push(createModuleInspectorSpy({
    // no builtins in the browser (yet!)
    isBuiltin: () => false,
    // should prepare debug info
    includeDebugInfo: opts.includeDebugInfo,
    // write policy files to disk
    onResult: opts.onResult,
  }))
}
