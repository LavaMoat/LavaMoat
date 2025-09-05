const { runtimeBuilder } = require('./runtime/runtimeBuilder.js')

const { analyzeModules } = require('./buildtime/modulesData.js')

const path = require('node:path')
const assert = require('node:assert')

const {
  WebpackError,
  Compilation,
  sources: { RawSource },
} = require('webpack')
const browserResolve = require('browser-resolve')

const { generateIdentifierLookup } = require('./buildtime/aa.js')
const diag = require('./buildtime/diagnostics.js')
const { assertFields, progress } = require('./buildtime/utils.js')

const {
  generatePolicy,
  loadPolicy,
  stringifyPolicyReliably,
} = require('./buildtime/policyGenerator.js')

const { loadCanonicalNameMap } = require('@lavamoat/aa')

/**
 * This is jsdoc for reexport
 *
 * @typedef {import('./buildtime/types').LavaMoatPluginOptions} LavaMoatPluginOptions
 */

/**
 * Just import
 *
 * @import {LockdownOptions} from 'ses'
 * @import {CompleteLavaMoatPluginOptions} from './buildtime/types'
 * @import {CanonicalNameMap} from '@lavamoat/aa'
 * @import {LavaMoatPolicy} from 'lavamoat-core'
 */

// TODO: upcoming version of webpack may expose these constants, but we want to support more versions
// https://github.com/webpack/webpack/blob/07ac43333654280c5bc6014a3a69eda4c3b80273/lib/ModuleTypeConstants.js
// const {
//   JAVASCRIPT_MODULE_TYPE_AUTO,
//   JAVASCRIPT_MODULE_TYPE_DYNAMIC,
//   JAVASCRIPT_MODULE_TYPE_ESM,
// } = require("webpack/lib/ModuleTypeConstants");
const JAVASCRIPT_MODULE_TYPE_AUTO = 'javascript/auto'
const JAVASCRIPT_MODULE_TYPE_DYNAMIC = 'javascript/dynamic'
const JAVASCRIPT_MODULE_TYPE_ESM = 'javascript/esm'

const COVERED_MODULE_TYPES = [
  JAVASCRIPT_MODULE_TYPE_AUTO,
  JAVASCRIPT_MODULE_TYPE_DYNAMIC,
  JAVASCRIPT_MODULE_TYPE_ESM,
]

const POLICY_SNAPSHOT_FILENAME = 'policy-snapshot.json'

const { wrapGenerator } = require('./buildtime/generator.js')
const { sesEmitHook, sesPrefixFiles } = require('./buildtime/emitSes.js')
const EXCLUDE_LOADER = path.join(__dirname, './excludeLoader.js')

// =================================================================
// Plugin code
// =================================================================

const PLUGIN_NAME = 'LavaMoatPlugin'
/** @satisfies {LockdownOptions} */
const lockdownDefaults = /** @type {const} */ ({
  // lets code observe call stack, but easier debuggability
  errorTaming: 'unsafe',
  // shows the full call stack
  stackFiltering: 'verbose',
  // prevents most common override mistake cases from tripping up users
  overrideTaming: 'severe',
  // preserves JS locale methods, to avoid confusing users
  // prevents aliasing: toLocaleString() to toString(), etc
  localeTaming: 'unsafe',
})

class LavaMoatPlugin {
  /**
   * @param {LavaMoatPluginOptions} [options]
   */
  constructor(options = {}) {
    if (options.scuttleGlobalThis === true) {
      options.scuttleGlobalThis = { enabled: true, exceptions: [] }
    } else if (typeof options.scuttleGlobalThis === 'object') {
      options.scuttleGlobalThis = { ...options.scuttleGlobalThis }
      if (Array.isArray(options.scuttleGlobalThis.exceptions)) {
        options.scuttleGlobalThis.exceptions =
          options.scuttleGlobalThis.exceptions.map((e) => e.toString())
      } else {
        options.scuttleGlobalThis.exceptions = []
      }
    }

    /** @type {CompleteLavaMoatPluginOptions} */
    this.options = {
      policyLocation: path.join('lavamoat', 'webpack'),
      lockdown: lockdownDefaults,
      isBuiltin: () => false,
      runChecks: true,
      diagnosticsVerbosity: 0,
      ...options,
    }
    if (this.options.generatePolicyOnly) {
      this.options.generatePolicy = true
    }

    diag.level = this.options.diagnosticsVerbosity
  }
  /**
   * @param {import('webpack').Compiler} compiler The compiler instance
   * @returns {void}
   */
  apply(compiler) {
    /**
     * @typedef {Object} Store
     * @property {CompleteLavaMoatPluginOptions} options
     * @property {WebpackError[]} [mainCompilationWarnings]
     * @property {(string | number)[]} chunkIds Array of chunk ids that have
     *   been processed.
     * @property {string[]} excludes Array of module rawResource names that were
     *   excluded from wrapping
     * @property {string[]} tooEarly Array of module rawResource names that were
     *   not wrapped because they were generated before chunks were known
     * @property {CanonicalNameMap} [canonicalNameMap]
     * @property {LavaMoatPolicy} [runtimeOptimizedPolicy]
     * @property {string} [root]
     * @property {[string, (string | number)[]][]} [identifiersForModuleIds]
     * @property {(string | number)[]} [unenforceableModuleIds]
     * @property {(string | number)[]} [contextModuleIds]
     * @property {(path: string) => string | undefined} [pathToResourceId]
     * @property {Record<string, any>} [externals]
     */

    /** @type {Store} */
    const STORE = {
      options: this.options,
      chunkIds: [],
      excludes: [],
      tooEarly: [],
    }

    const PROGRESS = progress({
      steps: [
        'start',
        'canonicalNameMap',
        'pathsCollected',
        'pathsProcessed',
        'generatorCalled:repeats',
        'runtimeAdded:repeats',
        'finish',
      ],
    })

    diag.run(2, () => {
      // Log stack traces for all errors on higher verbosity because webpack won't
      compiler.hooks.done.tap(PLUGIN_NAME, (stats) => {
        if (stats.hasErrors()) {
          stats.compilation.errors.forEach((error) => {
            console.error(error)
          })
        }
      })
    })

    // ========================================
    // finalize options

    if (typeof STORE.options.readableResourceIds === 'undefined') {
      // default options.readableResourceIds to true if webpack configuration sets development mode
      STORE.options.readableResourceIds = compiler.options.mode !== 'production'
    }

    let FORCED_CONCATENATEMODULES_OFF = false
    if (compiler.options.optimization.concatenateModules) {
      FORCED_CONCATENATEMODULES_OFF = true
    }
    // Concatenation won't work with wrapped modules. Have to disable it.
    compiler.options.optimization.concatenateModules = false

    // TODO: Research. If we fiddle a little with how we wrap the module, it might be possible to get inlining to work eventually by adding a closure that returns the module namespace. I just don't want to get into the compatibility of it all yet.
    // TODO: explore how these settings affect the Compartment wrapping etc.
    // compiler.options.optimization.mangleExports = false;
    // compiler.options.optimization.usedExports = false;
    // compiler.options.optimization.providedExports = false;
    // compiler.options.optimization.sideEffects = false;
    Object.freeze(STORE.options)

    // =======================================

    // loadCanonicalNameMap depends on having a resolver. It'd be best to use webpack's own, but it's problematic and the discrepancies between resolvers are not on the package level, but individual exports, which has not tripped us up yet.
    // sadly regular webpack compilation doesn't allow for synchronous resolver.
    //  Error: Cannot 'resolveSync' because the fileSystem is not sync. Use 'resolve'!
    // function adapterFunction(resolver) {
    //   return function(id, options) {
    //     // Extract the directory and module name from the id
    //     const dir = path.dirname(id);
    //     const moduleName = path.basename(id);

    //     // Call the resolver with the appropriatewindows arguments
    //     return resolver(options, dir, moduleName);
    //   };
    // }
    // resolve = { sync: adapterFunction(compilation.resolverFactory.get('normal').resolveSync.bind(compilation.resolverFactory.get('normal'))) }

    // =================================================================
    // run long asynchronous processing ahead of all compilations
    compiler.hooks.beforeRun.tapAsync(PLUGIN_NAME, (_, callback) => {
      assertFields(STORE, ['options'])
      loadCanonicalNameMap({
        rootDir: STORE.options.rootDir || compiler.context,
        includeDevDeps: true, // even the most proper projects end up including devDeps in their bundles :(
        resolve: browserResolve,
      })
        .then((map) => {
          STORE.canonicalNameMap = map
          PROGRESS.report('canonicalNameMap')
          callback()
        })
        .catch((err) => {
          callback(err)
        })
    })

    compiler.hooks.thisCompilation.tap(
      PLUGIN_NAME,
      (compilation, { normalModuleFactory }) => {
        // Wire up error and warning collection
        PROGRESS.reportErrorsTo(compilation.errors)
        STORE.mainCompilationWarnings = compilation.warnings
        assertFields(STORE, ['mainCompilationWarnings', 'options'])

        if (STORE.options.generatePolicyOnly) {
          compiler.options.devtool = false // source maps are expensive to make and unnecessary
          compiler.hooks.shouldEmit.tap(PLUGIN_NAME, () => false)
          compilation.hooks.shouldGenerateChunkAssets.tap(
            PLUGIN_NAME,
            () => false
          )
          // replacing generator with something returning an empty string could shave off some extra time, but is too invasive to seem worth it
        }

        if (
          FORCED_CONCATENATEMODULES_OFF ||
          STORE.options.diagnosticsVerbosity > 0
        ) {
          STORE.mainCompilationWarnings.push(
            new WebpackError(
              'LavaMoatPlugin: Concatenation of modules disabled - not compatible with LavaMoat wrapped modules.'
            )
          )
        }

        // Adjust scuttling configuration to not scuttle webpack chunk loading facilities
        if (
          typeof STORE.options.scuttleGlobalThis === 'object' &&
          Array.isArray(STORE.options.scuttleGlobalThis.exceptions)
        ) {
          STORE.options.scuttleGlobalThis.exceptions.push(
            compilation.outputOptions.chunkLoadingGlobal || 'webpackChunk'
          )
        }

        compilation.hooks.optimizeAssets.tap(PLUGIN_NAME, () => {
          // By the time assets are being optimized we should have finished.
          // This will ensure all previous steps have been done.
          PROGRESS.report('finish')
        })

        // =================================================================
        // javascript modules generator tweaks installation

        const generatorWrapper = wrapGenerator({
          excludes: STORE.excludes,
          runChecks: STORE.options.runChecks,
          PROGRESS,
        })

        for (const moduleType of COVERED_MODULE_TYPES) {
          normalModuleFactory.hooks.generator
            .for(moduleType)
            .tap(PLUGIN_NAME, generatorWrapper.generatorHookHandler)
        }

        diag.run(1, () => {
          // Report on excluded modules as late as possible.
          // This hook happens after all module generators have been executed.
          compilation.hooks.afterProcessAssets.tap(PLUGIN_NAME, () => {
            assertFields(STORE, ['excludes', 'mainCompilationWarnings'])
            if (STORE.excludes.length > 0) {
              STORE.mainCompilationWarnings.push(
                new WebpackError(
                  `LavaMoatPlugin: Following modules were excluded by use of excludeLoader: \n  ${STORE.excludes.join('\n  ')}`
                )
              )
            }
          })
        })
        // =================================================================
        // END OF javascript modules generator tweaks installation

        // =================================================================
        // afterOptimizeChunkIds hook for processing all identified modules
        compilation.hooks.afterOptimizeChunkIds.tap(PLUGIN_NAME, (chunks) => {
          try {
            assertFields(STORE, [
              'options',
              'mainCompilationWarnings',
              'chunkIds',
              'canonicalNameMap',
            ])

            const chunkGraph = compilation.chunkGraph

            /**
             * @type {{
             *   module: import('webpack').Module
             *   moduleId: string | number | null
             * }[]}
             */
            const allIdentifiedModules = []
            Array.from(chunks).forEach((chunk) => {
              // Collect chunk IDs and info while we're here
              if (chunk.id !== null) {
                STORE.chunkIds.push(chunk.id)
              }

              chunkGraph.getChunkModules(chunk).forEach((module) => {
                const moduleId = chunkGraph.getModuleId(module)
                allIdentifiedModules.push({ module, moduleId })
              })
            })

            const moduleData = analyzeModules({
              mainCompilationWarnings: STORE.mainCompilationWarnings,
              allIdentifiedModules,
            })
            diag.rawDebug(
              3,
              JSON.stringify({ knownPaths: moduleData.knownPaths })
            )
            PROGRESS.report('pathsCollected')

            const policyToApply = STORE.options.generatePolicy
              ? generatePolicy({
                  location: STORE.options.policyLocation,
                  canonicalNameMap: STORE.canonicalNameMap,
                  isBuiltin: STORE.options.isBuiltin,
                  modulesToInspect: moduleData.inspectable.map((module) => ({
                    module,
                    connections:
                      compilation.moduleGraph.getOutgoingConnections(module),
                  })),
                })
              : loadPolicy({
                  policyFromOptions: STORE.options.policy,
                  location: STORE.options.policyLocation,
                })

            if (STORE.options.generatePolicyOnly) {
              PROGRESS.cancel() // prevents progress errors
              compilation.clearAssets() // causes most further compilation work to be skipped
              return
            }

            if (STORE.options.emitPolicySnapshot) {
              compilation.emitAsset(
                POLICY_SNAPSHOT_FILENAME,
                new RawSource(stringifyPolicyReliably(policyToApply))
              )
            }

            assert(
              policyToApply !== undefined,
              'Policy was not specified nor generated.'
            )

            const identifierLookup = generateIdentifierLookup({
              readableResourceIds: STORE.options.readableResourceIds,
              contextModules: moduleData.contextModules,
              externals: moduleData.externals,
              paths: moduleData.knownPaths,
              policy: policyToApply,
              canonicalNameMap: STORE.canonicalNameMap,
            })

            const { tooEarly } = generatorWrapper.enableGeneratorWrapping({
              getIdentifierForPath: identifierLookup.pathToResourceId,
            })

            const suspiciousTooEarly = tooEarly.filter(
              identifierLookup.isKnownPath
            )

            if (suspiciousTooEarly.length > 0) {
              STORE.mainCompilationWarnings.push(
                new WebpackError(
                  `LavaMoatPlugin: sources generated for modules before all paths were known. The following modules in the bundle might not be wrapped in a Compartment: \n  ${suspiciousTooEarly.join('\n  ')}`
                )
              )
            }
            diag.run(1, () => {
              if (tooEarly.length > 0) {
                STORE.mainCompilationWarnings.push(
                  new WebpackError(
                    `LavaMoatPlugin: All modules with 'generate' step executed before all paths were known \n  ${tooEarly.join('\n  ')}`
                  )
                )
              }
            })

            STORE.root = identifierLookup.root
            STORE.identifiersForModuleIds =
              identifierLookup.identifiersForModuleIds
            STORE.unenforceableModuleIds = moduleData.unenforceableModuleIds
            STORE.contextModuleIds = moduleData.contextModules.map(
              ({ moduleId }) => moduleId
            )
            STORE.externals = moduleData.externals
            // narrow down the policy and map to module identifiers
            // TODO: theoretically policy could be optimized per chunk, but configuring webpack to emit a runtime chunk or have separate builds seems better for most usecases.
            STORE.runtimeOptimizedPolicy =
              identifierLookup.getTranslatedPolicy()

            diag.run(1, () => {
              assertFields(STORE, ['runtimeOptimizedPolicy'])
              const originalKeys = Object.keys(policyToApply.resources)
              const optimizedKeys = Object.keys(
                STORE.runtimeOptimizedPolicy?.resources
              )
              const optimizedKeysSet = new Set(optimizedKeys)
              const policyKeyDiff = originalKeys.filter(
                (k) => !optimizedKeysSet.has(k)
              )
              if (policyKeyDiff.length > 0) {
                diag.rawDebug(
                  1,
                  `policy.json contained ${policyKeyDiff.length} resources that did not match anything in the bundle. `
                )
                diag.rawDebug(
                  2,
                  `policy.json unused resources: \n${policyKeyDiff.join(', ')}`
                )
              }
            })

            // =================================================================

            if (moduleData.unenforceableModuleIds.length > 0) {
              STORE.mainCompilationWarnings.push(
                new WebpackError(
                  `LavaMoatPlugin: the following module ids can't be controlled by policy and must be ignored at runtime: \n  ${moduleData.unenforceableModuleIds.join()}`
                )
              )
            }
            PROGRESS.report('pathsProcessed')
          } catch (/** @type {any} */ error) {
            // NOTE: Webpack is handling regular errors pushed to compilation.errors just fine despite the type being set to WebpackError[]. I'd be convinced to wrap them in WebpackError if it didn't lack support of `cause`.
            compilation.errors.push(error)
          }
        })
        // =================================================================
        // END OF afterOptimizeChunkIds hook for processing all identified modules

        // =================================================================
        // This part adds LavaMoat runtime to webpack runtime for every chunk that needs runtime.

        const onceForChunkSet = new WeakSet()
        const chunkRuntimeWarningsDedupe = new Set()

        const { getLavaMoatRuntimeModules } = runtimeBuilder({
          options: STORE.options,
        })

        // Define a handler function to be called for each chunk in the compilation.
        compilation.hooks.additionalChunkRuntimeRequirements.tap(
          PLUGIN_NAME + '_runtime',
          (chunk /*, set*/) => {
            if (chunk.hasRuntime()) {
              if (!PROGRESS.done('generatorCalled')) {
                assertFields(STORE, ['options', 'mainCompilationWarnings'])
                if (!chunkRuntimeWarningsDedupe.has(chunk.id)) {
                  STORE.mainCompilationWarnings.push(
                    new WebpackError(
                      `LavaMoatPlugin: Something was generating runtime before all modules were identified. This might be part of a sub-compilation of a plugin. Please check for any unwanted interference between plugins. [chunk name: '${chunk.name}']`
                    )
                  )
                  chunkRuntimeWarningsDedupe.add(chunk.id)
                }
                diag.rawDebug(
                  2,
                  'skipped adding runtime (additionalChunkRuntimeRequirements)'
                )
                // It's possible to generate the runtime with an empty policy to make the wrapped code work.
                // It's no longer necessary now that `generate` function is only wrapping anything if paths were processed - which is when generator wrapping gets enabled,
                // which corresponds to it being the main compilation. But plugins may exist that conflict with that assumption;
                // in which case we're gonna have to bring back the runtime with empty policy
              } else {
                // If the chunk has already been processed, skip it.
                if (onceForChunkSet.has(chunk)) {
                  STORE.mainCompilationWarnings.push(
                    new WebpackError(
                      `LavaMoatPlugin: Skipped adding runtime again to the same chunk [chunk name: '${chunk.name}']`
                    )
                  )
                  return
                }

                assertFields(STORE, [
                  'options',
                  'mainCompilationWarnings',
                  'root',
                  'identifiersForModuleIds',
                  'unenforceableModuleIds',
                  'contextModuleIds',
                  'externals',
                  'runtimeOptimizedPolicy',
                ])

                const lavaMoatRuntimeModules = getLavaMoatRuntimeModules({
                  currentChunk: chunk,
                  chunkIds: STORE.chunkIds,
                  policyData: STORE.runtimeOptimizedPolicy,
                  identifiers: {
                    root: STORE.root,
                    identifiersForModuleIds: STORE.identifiersForModuleIds,
                    unenforceableModuleIds: STORE.unenforceableModuleIds,
                    contextModuleIds: STORE.contextModuleIds,
                    externals: STORE.externals,
                  },
                })

                // Add the runtime modules to the chunk, which handles
                // the runtime logic for wrapping with lavamoat.
                lavaMoatRuntimeModules.forEach((module) => {
                  compilation.addRuntimeModule(chunk, module)
                })

                // set.add(RuntimeGlobals.onChunksLoaded); // TODO: develop an understanding of what this line does and why it was a part of the runtime setup for module federation

                // Mark the chunk as processed by adding it to the WeakSet.
                onceForChunkSet.add(chunk)

                PROGRESS.report('runtimeAdded')
              }
            }
          }
        )

        if (STORE.options.inlineLockdown) {
          compilation.hooks.processAssets.tap(
            {
              name: PLUGIN_NAME,
              stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE,
            },
            sesPrefixFiles({
              compilation,
              inlineLockdown: STORE.options.inlineLockdown,
            })
          )
        } else {
          const HtmlWebpackPluginInUse = compiler.options.plugins.find(
            /**
             * @param {unknown} plugin
             * @returns {plugin is import('webpack').WebpackPluginInstance}
             */
            (plugin) =>
              !!plugin &&
              typeof plugin === 'object' &&
              plugin.constructor.name === 'HtmlWebpackPlugin'
          )
          compilation.hooks.processAssets.tap(
            {
              name: PLUGIN_NAME,
              stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
            },
            sesEmitHook({
              compilation,
              HtmlWebpackPluginInUse,
              HtmlWebpackPluginInterop:
                !!STORE.options.HtmlWebpackPluginInterop,
            })
          )
        }

        // TODO: add later hooks to optionally verify correctness and totality
        // of wrapping for the paranoid mode.
      }
    )
  }
}
module.exports = LavaMoatPlugin

module.exports.LavaMoatPlugin = LavaMoatPlugin
module.exports.exclude = EXCLUDE_LOADER
