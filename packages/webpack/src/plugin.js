const { runtimeBuilder } = require('./runtimeBuilder.js')

const { analyzeModules } = require('./buildtime/modulesData.js')

const path = require('node:path')
const assert = require('node:assert')

const {
  WebpackError,
  RuntimeModule,
  Compilation,
  sources: { RawSource },
} = require('webpack')
const browserResolve = require('browser-resolve')

const { generateIdentifierLookup } = require('./buildtime/aa.js')
const diag = require('./buildtime/diagnostics.js')
const progress = require('./buildtime/progress.js')
const { assertFields } = require('./buildtime/utils.js')

const {
  generatePolicy,
  loadPolicy,
  stringifyPolicyReliably,
} = require('./buildtime/policyGenerator.js')

const { loadCanonicalNameMap } = require('@lavamoat/aa')

/**
 * @import {LockdownOptions} from 'ses'
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

const POLICY_SNAPSHOT_FILENAME = 'policy-snapshot.json'

const { wrapGeneratorMaker } = require('./buildtime/generator.js')
const { sesEmitHook, sesPrefixFiles } = require('./buildtime/emitSes.js')
const EXCLUDE_LOADER = path.join(__dirname, './excludeLoader.js')

class VirtualRuntimeModule extends RuntimeModule {
  /**
   * @param {Object} options - The options for the VirtualRuntimeModule.
   * @param {string} options.name - The name of the module.
   * @param {string} options.source - The source code of the module.
   */
  constructor({ name, source }) {
    super(name)
    this.virtualSource = source
  }

  generate() {
    return this.virtualSource
  }
}

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
   * @param {Partial<LavaMoatPluginOptions>} [options]
   */
  constructor(options = {}) {
    /** @type {LavaMoatPluginOptions} */
    if (options.scuttleGlobalThis === true) {
      options.scuttleGlobalThis = { enabled: true }
    } else if (typeof options.scuttleGlobalThis === 'object') {
      options.scuttleGlobalThis = { ...options.scuttleGlobalThis }
      if (Array.isArray(options.scuttleGlobalThis.exceptions)) {
        options.scuttleGlobalThis.exceptions =
          options.scuttleGlobalThis.exceptions.map((e) => e.toString())
      }
    }

    this.options = {
      policyLocation: path.join('lavamoat', 'webpack'),
      lockdown: lockdownDefaults,
      isBuiltin: () => false,
      runChecks: true,
      ...options,
    }

    diag.level = options.diagnosticsVerbosity || 0
  }
  /**
   * @param {import('webpack').Compiler} compiler The compiler instance
   * @returns {void}
   */
  apply(compiler) {
    /**
     * @typedef {Object} Store
     * @property {LavaMoatPluginOptions} options
     * @property {WebpackError[]} [mainCompilationWarnings]
     * @property {(string | number)[]} chunkIds Array of chunk ids that have
     *   been processed.
     * @property {string[]} excludes Array of module rawResource names that were
     *   excluded from wrapping
     * @property {import('@lavamoat/aa').CanonicalNameMap} [canonicalNameMap]
     * @property {import('./buildtime/aa.js').IdentifierLookup} [identifierLookup]
     *   TODO: unpack into more fields
     */

    /** @type {Store} */
    const STORE = {
      options: this.options,
      chunkIds: [],
      excludes: [],
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

    // Concatenation won't work with wrapped modules. Have to disable it.
    compiler.options.optimization.concatenateModules = false
    // TODO: Research. If we fiddle a little with how we wrap the module, it might be possible to get inlining to work eventually by adding a closure that returns the module namespace. I just don't want to get into the compatibility of it all yet.
    // TODO: explore how these settings affect the Compartment wrapping etc.
    // compiler.options.optimization.runtimeChunk = false; // that one is ok, checked
    // compiler.options.optimization.mangleExports = false;
    // compiler.options.optimization.usedExports = false;
    // compiler.options.optimization.providedExports = false;
    // compiler.options.optimization.sideEffects = false;
    // compiler.options.optimization.moduleIds = "hashed";
    // compiler.options.optimization.chunkIds = "named";
    Object.freeze(STORE.options)

    // =======================================

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
    compiler.hooks.beforeRun.tapAsync(PLUGIN_NAME, (compilation, callback) => {
      assertFields(STORE, ['options'])
      loadCanonicalNameMap({
        rootDir: STORE.options.rootDir || compiler.context,
        includeDevDeps: true, // even the most proper projects end up including devDeps in their bundles :()
        resolve: browserResolve,
      })
        .then((map) => {
          STORE.canonicalNameMap = map
          assertFields(STORE, ['canonicalNameMap'])

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
        assertFields(STORE, ['mainCompilationWarnings'])
        STORE.mainCompilationWarnings.push(
          new WebpackError(
            'LavaMoatPlugin: Concatenation of modules disabled - not compatible with LavaMoat wrapped modules.'
          )
        )

        compilation.hooks.optimizeAssets.tap(PLUGIN_NAME, () => {
          // By the time assets are being optimized we should have finished.
          // This will ensure all previous steps have been done.
          PROGRESS.report('finish')
        })

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
            diag.rawDebug(4, { knownPaths: moduleData.knownPaths })
            PROGRESS.report('pathsCollected')

            diag.rawDebug(2, 'writing policy')

            let policyToApply
            if (STORE.options.generatePolicy) {
              policyToApply = generatePolicy({
                location: STORE.options.policyLocation,
                canonicalNameMap: STORE.canonicalNameMap,
                isBuiltin: STORE.options.isBuiltin,
                modulesToInspect: moduleData.inspectable.map((module) => ({
                  module,
                  connections:
                    compilation.moduleGraph.getOutgoingConnections(module),
                })),
              })
            } else {
              policyToApply = loadPolicy({
                policyFromOptions: STORE.options.policy,
                location: STORE.options.policyLocation,
              })
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

            // TODO: decouple further
            STORE.identifierLookup = generateIdentifierLookup({
              readableResourceIds: STORE.options.readableResourceIds,
              unenforceableModuleIds: moduleData.unenforceableModuleIds,
              contextModules: moduleData.contextModules,
              externals: moduleData.externals,
              paths: moduleData.knownPaths,
              policy: policyToApply,
              canonicalNameMap: STORE.canonicalNameMap,
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
        // javascript modules generator tweaks installation

        const coveredModuleTypes = [
          JAVASCRIPT_MODULE_TYPE_AUTO,
          JAVASCRIPT_MODULE_TYPE_DYNAMIC,
          JAVASCRIPT_MODULE_TYPE_ESM,
        ]

        // Caveat: this might be called before the lookup map is ready if a plugin is running a child compilation or alike.
        // Note that in those cases wrapped code is not meant to run and policy will be empty.
        /**
         * @param {string} p
         */
        const getIdentifierForPath = (p) => {
          PROGRESS.assertDone('pathsProcessed')
          // TODO: this doesn't make sense, identifierLookup needs to be partially dismantled and rewrapped
          assertFields(STORE, ['identifierLookup'])
          return STORE.identifierLookup.pathToResourceId(p)
        }

        for (const moduleType of coveredModuleTypes) {
          normalModuleFactory.hooks.generator.for(moduleType).tap(
            PLUGIN_NAME,
            wrapGeneratorMaker({
              excludes: STORE.excludes,
              runChecks: STORE.options.runChecks,
              getIdentifierForPath,
              PROGRESS,
            })
          )
        }

        // Report on excluded modules as late as possible.
        // This hook happens after all module generators have been executed.
        compilation.hooks.afterProcessAssets.tap(PLUGIN_NAME, () => {
          assertFields(STORE, ['excludes', 'mainCompilationWarnings'])
          diag.rawDebug(3, '> afterProcessAssets')
          if (STORE.excludes.length > 0) {
            STORE.mainCompilationWarnings.push(
              new WebpackError(
                `in LavaMoatPlugin: excluded modules \n  ${STORE.excludes.join('\n  ')}`
              )
            )
          }
        })
        // =================================================================
        // END OF javascript modules generator tweaks installation

        // =================================================================
        // This part adds LavaMoat runtime to webpack runtime for every chunk that needs runtime.

        const onceForChunkSet = new WeakSet()

        const { getLavaMoatRuntimeSource } = runtimeBuilder({
          options: STORE.options,
        })

        // Define a handler function to be called for each chunk in the compilation.
        compilation.hooks.additionalChunkRuntimeRequirements.tap(
          PLUGIN_NAME + '_runtime',
          (chunk /*, set*/) => {
            if (chunk.hasRuntime()) {
              if (!PROGRESS.done('generatorCalled')) {
                assertFields(STORE, [
                  'options',
                  'mainCompilationWarnings',
                  // 'identifierLookup', // TODO: sometimes runtime chunks are generated as part of plugins running and they're the useless/dummy ones. As a result we need to figure out a good condition for early exit from this hook maybe
                ])
                STORE.mainCompilationWarnings.push(
                  new WebpackError(
                    'LavaMoatPlugin: Something was generating runtime before all modules were identified. This might be part of a sub-compilation of a plugin. Please check for any unwanted interference between plugins.'
                  )
                )
                diag.rawDebug(
                  1,
                  '> skipped adding runtime (additionalChunkRuntimeRequirements)'
                )
                // It's possible to generate the runtime with an empty policy to make the wrapped code work.
                // It's no longer necessary now that `generate` function is only wrapping anything if paths were processed,
                // which corresponds to it being the main compilation. But plugins may exist that conflict with that assumption;
                // in which case we're gonna have to bring back the runtime with empty policy
              } else {
                // If the chunk has already been processed, skip it.
                if (onceForChunkSet.has(chunk)) {
                  diag.rawDebug(
                    1,
                    '> skipped adding runtime (additionalChunkRuntimeRequirements)'
                  )
                  return
                }

                assertFields(STORE, [
                  'options',
                  'mainCompilationWarnings',
                  'identifierLookup',
                ])

                // narrow down the policy and map to module identifiers
                const policyData = STORE.identifierLookup.getTranslatedPolicy()

                const lavaMoatRuntime = getLavaMoatRuntimeSource({
                  currentChunkName: chunk.name,
                  chunkIds: STORE.chunkIds,
                  policyData,
                  identifierLookup: STORE.identifierLookup,
                })

                // Add the runtime modules to the chunk, which handles
                // the runtime logic for wrapping with lavamoat.
                compilation.addRuntimeModule(
                  chunk,
                  new VirtualRuntimeModule({
                    name: 'LavaMoat/runtime',
                    source: lavaMoatRuntime,
                  })
                )

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

LavaMoatPlugin.exclude = EXCLUDE_LOADER

module.exports = LavaMoatPlugin

/**
 * @typedef {Object} ScuttlerObjectConfig
 * @property {boolean} [enabled] - Indicates whether the feature is enabled
 * @property {string[]} [exceptions] - A list of exceptions as strings
 * @property {string} [scuttlerName] - The name of the scuttler
 */

/**
 * @typedef {ScuttlerObjectConfig | boolean | undefined} ScuttlerConfig
 */

/**
 * @typedef {Object} LavaMoatPluginOptions
 * @property {boolean} [generatePolicy] - Generate the policy file
 * @property {string} [rootDir] - Specify root directory for canonicalNames to
 *   be resolved from if different than compiler.context
 * @property {string} policyLocation - Directory containing policy files are
 *   stored, defaults to './lavamoat/webpack'
 * @property {boolean} [emitPolicySnapshot] - Additionally put policy in dist of
 *   webpack compilation
 * @property {boolean} [readableResourceIds] - Should resourceIds be readable or
 *   turned into numbers - defaults to (mode==='development')
 * @property {boolean} [HtmlWebpackPluginInterop] - Add a script tag to the html
 *   output for lockdown.js if HtmlWebpackPlugin is in use
 * @property {RegExp} [inlineLockdown] - Prefix the matching files with lockdown
 * @property {number} [diagnosticsVerbosity] - A number representing diagnostics
 *   output verbosity, the larger the more overwhelming
 * @property {LockdownOptions} lockdown - Options to pass to SES lockdown
 * @property {import('lavamoat-core').LavaMoatPolicy} [policy] - LavaMoat policy
 *   object - if programmatically created
 * @property {boolean} [runChecks] - Check resulting code with wrapping for
 *   correctness
 * @property {(specifier: string) => boolean} isBuiltin - A function that
 *   determines if the specifier is a builtin of the runtime platform e.g.
 *   node:fs
 * @property {ScuttlerConfig} [scuttleGlobalThis] - Configuration for enabling
 *   scuttling mode
 * @property {boolean} [debugRuntime] - Enable runtime debugging tools
 * @property {RegExp} [unlockedChunksUnsafe] - A regex to match chunk names that
 *   should be running without enforcement. This is unsafe and should only be
 *   used when a part of the app is running in an environment that can't be
 *   locked down..
 */
