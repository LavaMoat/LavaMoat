const {
  createModuleInspector,
  LavamoatModuleRecord,
  loadPoliciesSync,
  jsonStringifySortedPolicy,
} = require('lavamoat-core')
const { getPackageNameForModulePath } = require('@lavamoat/aa')
const { writeFileSync, mkdirSync } = require('node:fs')
const path = require('node:path')

const { isExcludedUnsafe } = require('./exclude')
const diag = require('./diagnostics')

/**
 * @typedef {(specifier: string) => boolean} IsBuiltinFn
 */

/**
 * @typedef {import('webpack').NormalModule | import('webpack').ExternalModule} InspectableWebpackModule
 */

/** @import {LavaMoatPolicy} from '@lavamoat/types' */
/** @import {CanonicalNameMap} from '@lavamoat/aa' */

module.exports = {
  stringifyPolicyReliably: jsonStringifySortedPolicy,
  /**
   * @param {Object} opts
   * @param {LavaMoatPolicy | undefined} opts.policyFromOptions
   * @param {string} opts.location
   * @returns {LavaMoatPolicy}
   */
  loadPolicy({ policyFromOptions, location }) {
    const { policy, applyOverride } = loadPoliciesSync({
      policyPath: path.join(location, 'policy.json'),
      policyOverridePath: path.join(location, 'policy-override.json'),
      debugMode: false,
    })

    /** @type {LavaMoatPolicy} */
    let final = { resources: {} }
    if (policyFromOptions) {
      // TODO: avoid loading the policy file if policyFromOptions is present
      final = policyFromOptions
    } else if (policy) {
      final = applyOverride(policy)
    }
    return final
  },
  /**
   * @param {Object} opts
   * @param {CanonicalNameMap} opts.canonicalNameMap - Generated from aa
   * @param {string} opts.location - Where to read/write the policy files
   * @param {IsBuiltinFn} opts.isBuiltin - A function that determines if the
   *   specifier is a builtin of the runtime platform e.g. node:fs
   * @returns
   */
  /**
   * @typedef {{
   *   module: InspectableWebpackModule
   *   connections: Iterable<import('webpack').ModuleGraphConnection>
   * }} ModuleWithConnections
   */

  /**
   * @param {Object} opts
   * @param {CanonicalNameMap} opts.canonicalNameMap
   * @param {string} opts.location
   * @param {IsBuiltinFn} opts.isBuiltin
   * @param {ModuleWithConnections[]} opts.modulesToInspect
   * @returns {LavaMoatPolicy}
   */
  generatePolicy({ canonicalNameMap, location, isBuiltin, modulesToInspect }) {
    const { applyOverride } = loadPoliciesSync({
      policyPath: path.join(location, 'policy.json'),
      policyOverridePath: path.join(location, 'policy-override.json'),
      debugMode: false,
    })

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

    for (const { module, connections } of modulesToInspect) {
      // Skip modules the user intentionally excludes.
      // This is policy generation so we don't need to protect ourselves from an attack where the module has a loader defined in the specifier.
      if (isExcludedUnsafe(module)) continue

      if (module.userRequest === undefined) {
        diag.rawDebug(1, `LavaMoatPlugin: Module ${module} has no userRequest`)
        diag.rawDebug(2, { skippingInspectingModule: module })
        continue
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
      })

      try {
        moduleInspector.inspectModule(moduleRecord)
      } catch (/** @type any */ e) {
        throw new Error(
          `LavaMoatPlugin: Failed to inspect module ${module.userRequest} for policy generation:\n ${e.message}\n If the file is not intended to be valid JavaScript, consider excluding it using LavaMoat.exclude loader.`,
          { cause: e }
        )
      }
    }

    const policy = moduleInspector.generatePolicy({})
    mkdirSync(location, { recursive: true })
    writeFileSync(
      path.join(location, 'policy.json'),
      jsonStringifySortedPolicy(policy),
      'utf8'
    )
    return applyOverride(policy)
  },
}
