// TODO: scope it properly to compilation
// const { parse, inspectGlobals } = require('lavamoat-tofu')
const { createModuleInspector, LavamoatModuleRecord } = require('lavamoat-core')
const { getPackageNameForModulePath } = require('@lavamoat/aa')
const { writeFileSync, mkdirSync, existsSync } = require('fs')
const path = require('path')
const stringify = require('json-stable-stringify')


const dummyPolicyGenerator = {
  inspectWebpackModule: () => {},
  getPolicy: () => (null),
  writePolicy: () => {},
}

module.exports = {
  createPolicyGenerator({ canonicalNameMap, enabled, location }) {
    if(!enabled) return dummyPolicyGenerator
    const moduleInspector = createModuleInspector({
      isBuiltin: () => false,
      includeDebugInfo: false,
    })

    return {
      inspectWebpackModule: (module, connections) => {
        // process._rawDebug(module.originalSource().source())
        const moduleRecord = new LavamoatModuleRecord({
          // oh boi, where do I get these from?
          specifier: module.userRequest,
          file: module.userRequest,
          type: 'js',
          packageName: getPackageNameForModulePath(
            canonicalNameMap,
            module.userRequest
          ),
          content: module.originalSource().source(),
          importMap: {
            //there are no builtins and we'll supply a dependency aggregator so this can be skipped later
            // for now, let's give this a try
            ...Array.from(connections).reduce((acc, dep) => {
              const depSpecifier = dep.resolvedModule.userRequest
              acc[depSpecifier] = depSpecifier
              return acc
            },{}),
          },
          //ast: module._ast, - would have to translate to babel anyway
        })

        moduleInspector.inspectModule(moduleRecord)
      },
      getPolicy: () => moduleInspector.generatePolicy({}),
      writePolicy: () => {
        const policy = moduleInspector.generatePolicy({})
        if(!existsSync(location)) {
          mkdirSync(location, { recursive: true })
        }
        writeFileSync(path.join(location,'policy.json'), stringify(policy, { space: 2 }))
      },
    }
  },
}
