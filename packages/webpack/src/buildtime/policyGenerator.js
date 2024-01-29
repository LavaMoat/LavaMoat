// TODO: scope it properly to compilation
// const { parse, inspectGlobals } = require('lavamoat-tofu')
const {
  createModuleInspector,
  LavamoatModuleRecord,
  loadPoliciesSync,
} = require('lavamoat-core')
const { getPackageNameForModulePath } = require('@lavamoat/aa')
const { writeFileSync, mkdirSync, existsSync } = require('fs')
const path = require('path')
const stringify = require('json-stable-stringify')
const {
  sources: { RawSource },
} = require('webpack')

const POLICY_SNAPSHOT_FILENAME = 'policy-snapshot.json'

module.exports = {
  createPolicyGenerator({
    policyFromOptions,
    canonicalNameMap,
    compilation,
    enabled,
    location,
    emit = false,
  }) {
    const { policy, applyOverride } = loadPoliciesSync({
      policyPath: path.join(location, 'policy.json'),
      policyOverridePath: path.join(location, 'policy-override.json'),
      debugMode: false,
    })

    if (!enabled)
      return {
        inspectWebpackModule: () => {},
        getPolicy: () => {
          let final
          if (policyFromOptions) {
            final = policyFromOptions
          } else {
            final = applyOverride(policy)
          }
          if (emit) {
            compilation.emitAsset(
              POLICY_SNAPSHOT_FILENAME,
              new RawSource(stringify(final, { space: 2 }))
            )
          }
          return final
        },
      }

    // load policy file
    // load overrides
    // generate policy if requested and write to file
    // merge result with overrides
    // return that and emit snapshot
    const moduleInspector = createModuleInspector({
      isBuiltin: () => false,
      includeDebugInfo: false,
    })

    return {
      inspectWebpackModule: (module, connections) => {
        // process._rawDebug(module.originalSource().source())
        const moduleRecord = new LavamoatModuleRecord({
          // Knowing the actual specifier is not relevant here, they're used as unique identifiers that match between here and dependencies
          specifier: module.userRequest,
          file: module.userRequest,
          type: 'js',
          packageName: getPackageNameForModulePath(
            canonicalNameMap,
            module.userRequest
          ),
          content: module.originalSource().source(),
          importMap: {
            // connections are a much better source of information than module.dependencies which contain
            // all imported references separately along with exports and fluff
            ...Array.from(connections).reduce((acc, dep) => {
              const depSpecifier = dep.resolvedModule.userRequest
              acc[depSpecifier] = depSpecifier
              return acc
            }, {}),
          },
          //ast: module._ast, - would have to translate to babel anyway
        })

        moduleInspector.inspectModule(moduleRecord)
      },
      getPolicy: () => {
        const policy = moduleInspector.generatePolicy({})
        if (!existsSync(location)) {
          mkdirSync(location, { recursive: true })
        }
        writeFileSync(
          path.join(location, 'policy.json'),
          stringify(policy, { space: 2 })
        )
        const final = applyOverride(policy)
        if (emit) {
          compilation.emitAsset(
            POLICY_SNAPSHOT_FILENAME,
            new RawSource(stringify(final, { space: 2 }))
          )
        }
        return final
      },
    }
  },
}
