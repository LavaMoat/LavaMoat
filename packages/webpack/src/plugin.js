const path = require('node:path')
const assert = require('node:assert')

const { WebpackError, RuntimeModule } = require('webpack')
const { Compilation } = require('webpack')
const browserResolve = require('browser-resolve')

const { generateIdentifierLookup } = require('./buildtime/aa.js')
const diag = require('./buildtime/diagnostics.js')
const progress = require('./buildtime/progress.js')
const { createPolicyGenerator } = require('./buildtime/policyGenerator.js')
const { assembleRuntime } = require('./buildtime/assemble.js')

const { loadCanonicalNameMap } = require('@lavamoat/aa')

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

// @ts-ignore
const { RUNTIME_KEY } = require('./ENUM.json')
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
  // gives a semi-high resolution timer
  dateTaming: 'unsafe',
  // this is introduces non-determinism, but is otherwise safe
  mathTaming: 'unsafe',
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
    }
    options.scuttleGlobalThis = Object.assign({}, options.scuttleGlobalThis)
    this.options = {
      policyLocation: path.join('lavamoat', 'webpack'),
      lockdown: lockdownDefaults,
      isBuiltin: () => false,
      ...options,
    }

    diag.level = options.diagnosticsVerbosity || 0
  }
  /**
   * @param {import('webpack').Compiler} compiler The compiler instance
   * @returns {void}
   */
  apply(compiler) {
    // TODO: figure out the right scope to use this chronology tool
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

    const options = this.options

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

    if (typeof options.readableResourceIds === 'undefined') {
      // default options.readableResourceIds to true if webpack configuration sets development mode
      options.readableResourceIds = compiler.options.mode !== 'production'
    }
    /** @type {import('@lavamoat/aa').CanonicalNameMap} */
    let canonicalNameMap

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

    // sadly regular webpack compilation doesn't allow for synchronous resolver.
    //  Error: Cannot 'resolveSync' because the fileSystem is not sync. Use 'resolve'!
    // function adapterFunction(resolver) {
    //   return function(id, options) {
    //     // Extract the directory and module name from the id
    //     const dir = path.dirname(id);
    //     const moduleName = path.basename(id);

    //     // Call the resolver with the appropriate arguments
    //     return resolver(options, dir, moduleName);
    //   };
    // }
    // resolve = { sync: adapterFunction(compilation.resolverFactory.get('normal').resolveSync.bind(compilation.resolverFactory.get('normal'))) }

    // =================================================================
    // run long asynchronous processing ahead of all compilations
    compiler.hooks.beforeRun.tapAsync(PLUGIN_NAME, (compilation, callback) =>
      loadCanonicalNameMap({
        rootDir: options.rootDir || compiler.context,
        includeDevDeps: true, // even the most proper projects end up including devdeps in their bundles :()
        resolve: browserResolve,
      })
        .then((map) => {
          canonicalNameMap = map
          PROGRESS.report('canonicalNameMap')
          callback()
        })
        .catch((err) => {
          callback(err)
        })
    )

    /** @type {WebpackError[]} */
    let mainCompilationWarnings

    compiler.hooks.thisCompilation.tap(
      PLUGIN_NAME,
      (compilation, { normalModuleFactory }) => {
        PROGRESS.reportErrorsTo(compilation.errors)
        compilation.hooks.optimizeAssets.tap(PLUGIN_NAME, () => {
          // By the time assets are being optimized we should have finished.
          // This will ensure all previous steps have been done.
          PROGRESS.report('finish')
        })

        // =================================================================

        if (!mainCompilationWarnings) {
          mainCompilationWarnings = compilation.warnings
          mainCompilationWarnings.push(
            new WebpackError(
              'LavaMoatPlugin: Concatenation of modules disabled - not compatible with LavaMoat wrapped modules.'
            )
          )
        }

        // =================================================================
        const policyGenerator = createPolicyGenerator({
          policyFromOptions: options.policy,
          enabled: !!options.generatePolicy,
          location: options.policyLocation,
          emit: options.emitPolicySnapshot,
          canonicalNameMap,
          compilation,
          isBuiltin: options.isBuiltin,
        })

        // =================================================================
        // processin of the paths involved in the bundle and cross-check with policy

        /**
         * Array of strings representing the excludes found in the generation
         * process.
         *
         * @type {string[]}
         */
        const excludes = []
        /**
         * Array of objects representing the paths and module ids found in the
         * generation process.
         *
         * @type {{ path: string; moduleId: string | number }[]}
         */
        const knownPaths = []
        /**
         * Array of module ids that are unenforceable by policy.
         *
         * @type {(string | number)[]}
         */
        const unenforceableModuleIds = []
        /**
         * A record of module ids that are externals and need to be enforced as
         * builtins.
         *
         * @type {Record<string | number, string>}
         */
        const externals = {}
        /**
         * @type {import('./buildtime/aa.js').IdentifierLookup}
         */
        let identifierLookup
        const runChecks = this.options.runChecks || diag.level > 0

        // Caveat: this might be called before the lookup map is ready if a plugin is running a child compilation or alike.
        // Note that in those cases wrapped code is not meant to run and policy will be empty.
        /**
         * @param {string} p
         */
        const getIdentifierForPath = (p) => {
          PROGRESS.assertDone('pathsProcessed')
          return identifierLookup.pathToResourceId(p)
        }

        const coveredTypes = [
          JAVASCRIPT_MODULE_TYPE_AUTO,
          JAVASCRIPT_MODULE_TYPE_DYNAMIC,
          JAVASCRIPT_MODULE_TYPE_ESM,
        ]

        /**
         * @remarks
         * Webpack has a concept of ignored modules When a module is ignored a
         * carveout is necessary in policy enforcement for it because the ID
         * that webpack creates for it is not exactly helpful. example outcome
         * in the bundle: `const nodeCrypto = __webpack_require__(/*! crypto *\/
         * "?0b7d");` Sadly, even treeshaking doesn't eliminate that module.
         * It's left there and failing to work when reached by runtime policy
         * enforcement. Below is the most reliable way I've found to date to
         * identify ignored modules.
         * @param {import('webpack').Module} m
         * @returns {boolean}
         */
        const isIgnoredModule = (m) => {
          return Boolean(
            m.type === JAVASCRIPT_MODULE_TYPE_DYNAMIC &&
              // @ts-expect-error BAD TYPES
              m.identifierStr?.startsWith('ignored')
          )
        }

        /**
         * Checks if a module is a context module.
         *
         * @param {any} m - The module to check.
         * @param {string} moduleClass - The class of the module.
         * @returns {boolean} - Returns true if the module is a context module,
         *   otherwise false.
         */
        const isContextModule = (m, moduleClass) =>
          moduleClass === 'ContextModule'

        /**
         * Identifies an asset that webpack includes in dist by default without
         * setting any loaders explicitly.
         *
         * @param {import('webpack').Module} m
         * @returns {m is import('webpack').NormalModule}
         */
        const isAmbientAsset = (m) =>
          m.type === 'asset/resource' &&
          'resource' in m &&
          'loaders' in m &&
          Array.isArray(m.loaders) &&
          m.loaders.length === 0

        /**
         * @param {import('webpack').Module} m
         * @param {string} moduleClass
         * @returns {m is import('webpack').ExternalModule} // TODO: this is not
         *   true anymore, but there's no superclass of all reasonable module
         *   types
         */
        const isExternalModule = (m, moduleClass) =>
          ['ExternalModule'].includes(moduleClass) &&
          'externalType' in m &&
          m.externalType !== undefined
        /**
         * @param {import('webpack').Module} m
         * @param {string} moduleClass
         * @returns {m is import('./buildtime/policyGenerator.js').InspectableWebpackModule}
         */
        const isInspectableModule = (m, moduleClass) =>
          'userRequest' in m ||
          m.type?.startsWith('javascript') ||
          isExternalModule(m, moduleClass)

        // Old: good for collecting all possible paths, but bad for matching them with module ids
        // collect all paths resolved for the bundle and transition afterwards
        // normalModuleFactory.hooks.afterResolve.tap(
        //   PLUGIN_NAME,
        //   (resolveData) => {
        //     // TODO - typescript claims createData could be undefined. Do we care for those cases?
        //     // Leaving it in a state where we'll get an error first time it happens.
        //     if (coveredTypes.includes(resolveData.createData.type)) {
        //       knownPaths.push([resolveData.createData.resourceResolveData.path, /*resolveData.createData.moduleId*/]);
        //     }
        //   }
        // );
        // compilation.hooks.finishModules.tap(PLUGIN_NAME, () => {
        //   PROGRESS.report("pathsCollected");
        // });
        compilation.hooks.afterOptimizeChunkIds.tap(PLUGIN_NAME, (chunks) => {
          try {
            const chunkGraph = compilation.chunkGraph

            Array.from(chunks).forEach((chunk) => {
              chunkGraph.getChunkModules(chunk).forEach((module) => {
                const moduleId = chunkGraph.getModuleId(module)
                const moduleClass =
                  Object.getPrototypeOf(module).constructor.name

                if (moduleId === null) {
                  diag.rawDebug(
                    2,
                    `LavaMoatPlugin: module ${module.identifier()} has no moduleId, cannot cover it with policy.`
                  )
                  diag.rawDebug(4, { module })
                  return
                }

                // Fixes the issue with assets being emitted to dist without a loader
                // TODO: refactor to move random hardening of the build somewhere it's easier to track.
                if (
                  isAmbientAsset(module) &&
                  module.resource.includes('node_modules') // FIXME: would be better to use canonicalName lookup and match with root
                ) {
                  // add a warning about removing the asset
                  mainCompilationWarnings.push(
                    new WebpackError(
                      `LavaMoatPlugin: the following resource was being silently emitted to the dist directory and LavaMoat has prevented it: '${module.resource}'. If you want to add this resource, explicitly define a file-loader for it in your webpack configuration.`
                    )
                  )

                  // We can't use `chunkGraph.disconnectChunkAndModule` here
                  // because the require statement remains and errors out

                  if (module.generatorOptions) {
                    // generatorOptions was not present in testing, but types indicate it might be there
                    module.generatorOptions.emit = false
                  }
                  if (module.generator) {
                    module.generator = Object.create(module.generator, {
                      emit: {
                        value: false,
                        writable: false,
                        configurable: false,
                        enumerable: true,
                      },
                    })
                  }
                }

                if (
                  isIgnoredModule(module) ||
                  (options.__unsafeAllowContextModules &&
                    isContextModule(module, moduleClass))
                ) {
                  unenforceableModuleIds.push(moduleId)
                } else {
                  if (isExternalModule(module, moduleClass)) {
                    externals[moduleId] = module.userRequest
                  }
                  if (isInspectableModule(module, moduleClass)) {
                    policyGenerator.inspectWebpackModule(
                      module,
                      compilation.moduleGraph.getOutgoingConnections(module)
                    )
                  }

                  // typescript is complaining about the use of `resource` here, but it's actually there.
                  knownPaths.push({
                    path: /** @type {any} */ (module).resource,
                    moduleId,
                  })
                }
              })
            })
            diag.rawDebug(4, { knownPaths })
            PROGRESS.report('pathsCollected')

            diag.rawDebug(2, 'writing policy')
            // use the generated policy to save the user one additional pass
            // getting the policy also writes all files where necessary
            const policyToApply = policyGenerator.getPolicy()

            assert(
              policyToApply !== undefined,
              'Policy was not specified nor generated.'
            )

            identifierLookup = generateIdentifierLookup({
              readableResourceIds: options.readableResourceIds,
              unenforceableModuleIds,
              externals,
              paths: knownPaths,
              policy: policyToApply,
              canonicalNameMap,
            })

            if (unenforceableModuleIds.length > 0) {
              mainCompilationWarnings.push(
                new WebpackError(
                  `LavaMoatPlugin: the following module ids can't be controlled by policy and must be ignored at runtime: \n  ${unenforceableModuleIds.join()}`
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
        // javascript modules generator tweaks installation

        for (const moduleType of coveredTypes) {
          normalModuleFactory.hooks.generator.for(moduleType).tap(
            PLUGIN_NAME,
            wrapGeneratorMaker({
              excludes: excludes,
              runChecks,
              getIdentifierForPath,
              PROGRESS,
            })
          )
        }

        // Report on excluded modules as late as possible.
        // This hook happens after all module generators have been executed.
        compilation.hooks.afterProcessAssets.tap(PLUGIN_NAME, () => {
          diag.rawDebug(3, '> afterProcessAssets')
          if (excludes.length > 0) {
            mainCompilationWarnings.push(
              new WebpackError(
                `in LavaMoatPlugin: excluded modules \n  ${excludes.join('\n  ')}`
              )
            )
          }
        })

        // =================================================================
        // This part adds LavaMoat runtime to webpack runtime for every chunk that needs runtime.
        // I stole the idea from Zach of module federation fame

        const onceForChunkSet = new WeakSet()
        const runtimeOptions = {
          scuttleGlobalThis: options.scuttleGlobalThis,
          lockdown: options.lockdown,
        }

        // Define a handler function to be called for each chunk in the compilation.
        compilation.hooks.additionalChunkRuntimeRequirements.tap(
          PLUGIN_NAME + '_runtime',
          (chunk /*, set*/) => {
            if (chunk.hasRuntime()) {
              if (!PROGRESS.done('generatorCalled')) {
                mainCompilationWarnings.push(
                  new WebpackError(
                    'LavaMoatPlugin: Something was generating runtime before all modules were identified. This might be part of a sub-compilation of a plugin. Please check for any unwanted interference between plugins.'
                  )
                )
                diag.rawDebug(
                  1,
                  '> skipped adding runtime (additionalChunkRuntimeRequirements)'
                )
                // It's possible to generate the runtime with an empty policy to make the wrapped code work.
                // It's no longer necessasry now that `generate` function is only wrapping anything if paths were processed,
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
                diag.rawDebug(
                  1,
                  '> adding runtime (additionalChunkRuntimeRequirements)'
                )
                // narrow down the policy and map to module identifiers
                const policyData = identifierLookup.getTranslatedPolicy()

                const runtimeChunks = [
                  {
                    name: 'root',
                    data: identifierLookup.root || null,
                    json: true,
                  },
                  {
                    name: 'idmap',
                    data: identifierLookup.identifiersForModuleIds || null,
                    json: true,
                  },
                  {
                    name: 'unenforceable',
                    data: identifierLookup.unenforceableModuleIds || null,
                    json: true,
                  },
                  {
                    name: 'externals',
                    data: identifierLookup.externals || null,
                    json: true,
                  },
                  { name: 'options', data: runtimeOptions, json: true },
                  (typeof runtimeOptions?.scuttleGlobalThis === 'boolean' && runtimeOptions?.scuttleGlobalThis === true) ||
                  (typeof runtimeOptions?.scuttleGlobalThis === 'object' && runtimeOptions?.scuttleGlobalThis?.enabled === true) ?
                  {
                    name: 'scuttling',
                    shimRequire: 'lavamoat-core/src/scuttle.js',
                  } : {},
                  { name: 'policy', data: policyData, json: true },
                  {
                    name: 'ENUM',
                    file: path.join(__dirname, './ENUM.json'),
                    json: true,
                  },
                  {
                    name: 'endowmentsToolkit',
                    shimRequire: 'lavamoat-core/src/endowmentsToolkit.js',
                  },
                  {
                    name: 'runtime',
                    file: path.join(__dirname, './runtime/runtime.js'),
                  },
                ]

                if (options.debugRuntime) {
                  runtimeChunks.push({
                    name: 'debug',
                    shimRequire: path.join(__dirname, './runtime/debug.js'),
                  })
                }
                const lavaMoatRuntime = assembleRuntime(
                  RUNTIME_KEY,
                  runtimeChunks
                )

                // set.add(RuntimeGlobals.onChunksLoaded); // TODO: develop an understanding of what this line does and why it was a part of the runtime setup for module federation

                // Mark the chunk as processed by adding it to the WeakSet.
                onceForChunkSet.add(chunk)

                // Add the runtime modules to the chunk, which handles
                // the runtime logic for wrapping with lavamoat.
                compilation.addRuntimeModule(
                  chunk,
                  new VirtualRuntimeModule({
                    name: 'LavaMoat/runtime',
                    source: lavaMoatRuntime,
                  })
                )

                PROGRESS.report('runtimeAdded')
              }
            }
          }
        )

        if (options.inlineLockdown) {
          compilation.hooks.processAssets.tap(
            {
              name: PLUGIN_NAME,
              stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE,
            },
            sesPrefixFiles({
              compilation,
              inlineLockdown: options.inlineLockdown,
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
              HtmlWebpackPluginInterop: !!options.HtmlWebpackPluginInterop,
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
 * @typedef {Object} ScuttlerConfig
 * @property {boolean} [enabled] - Indicates whether the feature is enabled
 * @property {string[]} [exceptions] - A list of exceptions as strings
 * @property {string} [scuttlerName] - The name of the scuttler
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
 * @property {ScuttlerConfig | boolean} [scuttleGlobalThis] - Configuration for enabling scuttling mode
 * @property {boolean} [debugRuntime] - Enable runtime debugging tools
 * @property {boolean} [__unsafeAllowContextModules] - Skips enforcement of
 *   policies on ContextModule usage. This is only safe if you can guarantee
 *   that webpack only uses the missing module stub ContextModule and no actual
 *   modules get loaded through it.
 */

// Provided inline because import('ses') won't work in jsdoc of a cjs module
/**
 * @typedef {Object} LockdownOptions
 * @property {'safe' | 'unsafe'} [regExpTaming]
 * @property {'safe' | 'unsafe'} [localeTaming]
 * @property {'safe' | 'unsafe'} [consoleTaming]
 * @property {'platform' | 'exit' | 'abort' | 'report' | 'none'} [errorTrapping]
 * @property {'report' | 'none'} [unhandledRejectionTrapping]
 * @property {'safe' | 'unsafe'} [errorTaming]
 * @property {'safe' | 'unsafe'} [dateTaming]
 * @property {'safe' | 'unsafe'} [mathTaming]
 * @property {'safeEval' | 'unsafeEval' | 'noEval'} [evalTaming]
 * @property {'concise' | 'verbose'} [stackFiltering]
 * @property {'moderate' | 'min' | 'severe'} [overrideTaming]
 * @property {string[]} [overrideDebug]
 * @property {'safe' | 'unsafe'} [domainTaming]
 */
