const {
  createModuleInspector,
  LavamoatModuleRecord,
  loadPoliciesSync,
  // @ts-expect-error - missing types
} = require('lavamoat-core')
const { getPackageNameForModulePath } = require('@lavamoat/aa')
const { writeFileSync, mkdirSync } = require('node:fs')
const path = require('node:path')
const stringify = require('json-stable-stringify')
const {
  sources: { RawSource },
} = require('webpack')

const POLICY_SNAPSHOT_FILENAME = 'policy-snapshot.json'

module.exports = {
  /**
   * @param {Object} opts
   * @param {import('../types.js').Policy} [opts.policyFromOptions] - The
   *   hardcoded policy passed in options, takes precedence over reading from
   *   files
   * @param {import('@lavamoat/aa').CanonicalNameMap} opts.canonicalNameMap -
   *   Generated from aa
   * @param {import('webpack').Compilation} opts.compilation - Webpack
   *   compilation reference (for emitting assets)
   * @param {boolean} opts.enabled - Whether to generate a policy
   * @param {string} opts.location - Where to read/write the policy files
   * @param {boolean} [opts.emit] - Whether to emit the policy snapshot as an
   *   asset
   * @returns
   */
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
            // TODO: avoid loading the policy file if policyFromOptions is present
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
      /**
       * @param {import('webpack').NormalModule} module
       * @param {Iterable<import('webpack').ModuleGraphConnection>} connections
       */
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
          content: module.originalSource()?.source()?.toString(),
          importMap: {
            // connections are a much better source of information than module.dependencies which contain
            // all imported references separately along with exports and fluff
            ...Array.from(connections).reduce((acc, dep) => {
              // @ts-expect-error - bad types?
              const depSpecifier = dep.resolvedModule.userRequest
              acc[depSpecifier] = depSpecifier
              return acc
            }, /** @type {Record<string, string>} */ ({})),
          },
          //ast: module._ast, - would have to translate to babel anyway
        })

        moduleInspector.inspectModule(moduleRecord)
      },
      getPolicy: () => {
        const policy = moduleInspector.generatePolicy({})
        mkdirSync(location, { recursive: true })
        writeFileSync(
          path.join(location, 'policy.json'),
          stringify(policy, { space: 2 }),
          'utf8'
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
