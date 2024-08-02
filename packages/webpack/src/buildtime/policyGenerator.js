const {
  createModuleInspector,
  LavamoatModuleRecord,
  loadPoliciesSync,
  jsonStringifySortedPolicy,
} = require('lavamoat-core')
const { getPackageNameForModulePath } = require('@lavamoat/aa')
const { writeFileSync, mkdirSync } = require('node:fs')
const path = require('node:path')
const {
  sources: { RawSource },
} = require('webpack')

const { isExcludedUnsafe } = require('./exclude')
const diag = require('./diagnostics')

const POLICY_SNAPSHOT_FILENAME = 'policy-snapshot.json'

/**
 * @typedef {(specifier: string) => boolean} IsBuiltinFn
 */

/**
 * @typedef {import('webpack').NormalModule | import('webpack').ExternalModule} InspectableWebpackModule
 */

module.exports = {
  /**
   * @param {Object} opts
   * @param {import('@lavamoat/types').LavaMoatPolicy} [opts.policyFromOptions] -
   *   The hardcoded policy passed in options, takes precedence over reading
   *   from files
   * @param {import('@lavamoat/aa').CanonicalNameMap} opts.canonicalNameMap -
   *   Generated from aa
   * @param {import('webpack').Compilation} opts.compilation - Webpack
   *   compilation reference (for emitting assets)
   * @param {boolean} opts.enabled - Whether to generate a policy
   * @param {string} opts.location - Where to read/write the policy files
   * @param {boolean} [opts.emit] - Whether to emit the policy snapshot as an
   *   asset
   * @param {IsBuiltinFn} opts.isBuiltin - A function that determines if the
   *   specifier is a builtin of the runtime platform e.g. node:fs
   * @returns
   */
  createPolicyGenerator({
    policyFromOptions,
    canonicalNameMap,
    compilation,
    enabled,
    location,
    emit = false,
    isBuiltin,
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
          /** @type {import('@lavamoat/types').LavaMoatPolicy} */
          let final = { resources: {} }
          if (policyFromOptions) {
            // TODO: avoid loading the policy file if policyFromOptions is present
            final = policyFromOptions
          } else if (policy) {
            final = applyOverride(policy)
          }
          if (emit) {
            compilation.emitAsset(
              POLICY_SNAPSHOT_FILENAME,
              new RawSource(jsonStringifySortedPolicy(final))
            )
          }
          return final
        },
      }

    // load policy file
    // load overrides
    // generate policy if requested and write to fileWe're not aware of any
    // merge result with overrides
    // return that and emit snapshot
    const moduleInspector = createModuleInspector({
      isBuiltin,
      includeDebugInfo: false,
      // If the specifier is requested as a dependency in importMap but was never passed to inspectModule, its package name will be looked up here.
      // This is a workaround to inconsistencies in how webpack represents connections.
      // Specifically what happened to surface this issue: `connections` in webpack contain a module entry that's identified by the path to its index.mjs entrypoint while the index.js entrypoint is actually used in the bundle, so inspector doesn't have a cached entry for this one and without the fallback handler would return <unknown:/...>
      // There should be no security implications of this, since the package is already resolved clearly and this is only a part of policy generation, not runtime.
      moduleToPackageFallback: (specifier) =>
        getPackageNameForModulePath(canonicalNameMap, specifier),
    })

    return {
      /**
       * @param {InspectableWebpackModule} module
       * @param {Iterable<import('webpack').ModuleGraphConnection>} connections
       */
      inspectWebpackModule: (module, connections) => {
        // Skip modules the user intentionally excludes.
        // This is policy generation so we don't need to protect ourselves from an attack where the module has a loader defined in the specifier.
        if (isExcludedUnsafe(module)) return
        if (module.userRequest === undefined) {
          diag.rawDebug(
            1,
            `LavaMoatPlugin: Module ${module} has no userRequest`
          )
          diag.rawDebug(2, { skippingInspectingModule: module })
          return
        }
        const packageName = getPackageNameForModulePath(
          canonicalNameMap,
          module.userRequest
        )
        const moduleRecord = new LavamoatModuleRecord({
          // Knowing the actual specifier is not relevant here, they're used as unique identifiers that match between here and dependencies
          specifier: module.userRequest,
          file: module.userRequest,
          type: isBuiltin(module.userRequest) ? 'builtin' : 'js',
          packageName,
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

        try {
          moduleInspector.inspectModule(moduleRecord)
        } catch (/** @type any */ e) {
          throw new Error(
            `LavaMoatPlugin: Failed to inspect module ${module.userRequest} for policy generation:\n ${e.message}\n If the file is not intended to be valid JavaScript, consider excluding it using LavaMoat.exclude loader.`,
            { cause: e }
          )
        }
      },
      getPolicy: () => {
        const policy = moduleInspector.generatePolicy({})
        mkdirSync(location, { recursive: true })
        writeFileSync(
          path.join(location, 'policy.json'),
          jsonStringifySortedPolicy(policy),
          'utf8'
        )
        const final = applyOverride(policy)
        if (emit) {
          compilation.emitAsset(
            POLICY_SNAPSHOT_FILENAME,
            new RawSource(jsonStringifySortedPolicy(final))
          )
        }
        return final
      },
    }
  },
}
