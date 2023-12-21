// @ts-check

const path = require('path')
const { WebpackError, RuntimeModule } = require('webpack')
const Compilation = require('webpack/lib/Compilation')

const { generateIdentifierLookup } = require('./buildtime/aa.js')
const diag = require('./buildtime/diagnostics.js')
const progress = require('./buildtime/progress.js')
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

const { RUNTIME_KEY } = require('./ENUM.json')
const { wrapGeneratorMaker } = require('./buildtime/generator.js')
const { sesEmitHook } = require('./buildtime/emitSes.js')
const EXCLUDE_LOADER = path.join(__dirname, './excludeLoader.js')

class VirtualRuntimeModule extends RuntimeModule {
  constructor({ name, source }) {
    super(name)
    this.source = source
  }
  generate() {
    return this.source
  }
}

// =================================================================
// Plugin code
// =================================================================

const PLUGIN_NAME = 'LavaMoatPlugin'
const lockdownDefaults = {
  // lets code observe call stack, but easier debuggability
  errorTaming: 'unsafe',
  // shows the full call stack
  stackFiltering: 'verbose',
  // prevents most common override mistake cases from tripping up users
  overrideTaming: 'severe',
}

class LavaMoatPlugin {
  /**
   * @param {import('./types.js').LavaMoatPluginOptions} [options]
   */
  constructor(options = { policy: {} }) {
    if (!options.lockdown) {
      options.lockdown = lockdownDefaults
    }
    this.options = options

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
    if (typeof options.readableResourceIds === 'undefined') {
      // default options.readableResourceIds to true if webpack configuration sets development mode
      options.readableResourceIds = compiler.options.mode !== 'production'
    }

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

    // =================================================================
    // run long asynchronous processing ahead of all compilations
    compiler.hooks.beforeRun.tapAsync(PLUGIN_NAME, (compilation, callback) =>
      loadCanonicalNameMap({
        rootDir: compiler.context,
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

    let mainCompilationWarnings

    compiler.hooks.thisCompilation.tap(
      PLUGIN_NAME,
      (compilation, { normalModuleFactory }) => {
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
        // processin of the paths involved in the bundle and cross-check with policy

        const excludes = []
        const knownPaths = []
        const unenforceableModuleIds = []
        let identifierLookup
        const runChecks = this.options.runChecks || diag.level > 0

        // Caveat: this might be called before the lookup map is ready if a plugin is running a child compilation or alike.
        // Note that in those cases wrapped code is not meant to run and policy will be empty.
        const getIdentifierForPath = (p) => {
          PROGRESS.assertDone('pathsProcessed')
          return identifierLookup.pathToResourceId(p)
        }

        const coveredTypes = [
          JAVASCRIPT_MODULE_TYPE_AUTO,
          JAVASCRIPT_MODULE_TYPE_DYNAMIC,
          JAVASCRIPT_MODULE_TYPE_ESM,
        ]

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
          const chunkGraph = compilation.chunkGraph

          Array.from(chunks).forEach((chunk) => {
            chunkGraph.getChunkModules(chunk).forEach((module) => {
              const moduleId = chunkGraph.getModuleId(module)
              if (
                // Webpack has a concept of ignored modules
                // When a module is ignored a carveout is necessary in policy enforcement for it because the ID that webpack creates for it is not exactly helpful.
                // example outcome in the bundle: `const nodeCrypto = __webpack_require__(/*! crypto */ "?0b7d");`
                // Sadly, even treeshaking doesn't eliminate that module. It's left there and failing to work when reached by runtime policy enforcement.
                // Below is the most reliable way I've found to date to identify ignored modules.
                (module.type === JAVASCRIPT_MODULE_TYPE_DYNAMIC &&
                  // @ts-expect-error BAD TYPES
                  module.identifierStr?.startsWith('ignored')) ||
                // @ts-expect-error BAD TYPES
                module.resource === undefined // better to explicitly list it as unenforceable than let it fall through the cracks
              ) {
                unenforceableModuleIds.push(moduleId)
              } else {
                knownPaths.push({
                  path: /** @type {any} */ (module).resource,
                  moduleId,
                }) // typescript is complaining about the use of `resource` here, but it's actually there.
              }
            })
          })
          diag.rawDebug(4, { knownPaths })
          PROGRESS.report('pathsCollected')

          identifierLookup = generateIdentifierLookup({
            readableResourceIds: options.readableResourceIds,
            unenforceableModuleIds,
            paths: knownPaths,
            policy: options.policy,
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
        })
        // lists modules, but reaching for id can give a deprecation warning.
        // compilation.hooks.afterOptimizeModuleIds.tap(PLUGIN_NAME, (modules) => {
        //   console.log('________________________________',modules.__proto__.constructor)
        //   Array.from(modules).map(module => console.log(module.resource, module.id))
        // });

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
          mainCompilationWarnings.push(
            new WebpackError(
              `in LavaMoatPlugin: excluded modules \n  ${excludes.join('\n  ')}`
            )
          )
        })

        // =================================================================

        // This part adds LavaMoat runtime to webpack runtime for every chunk that needs runtime.
        // I stole this from Zach of module federation fame

        const onceForChunkSet = new WeakSet()
        const runtimeOptions = {
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

                const lavaMoatRuntime = assembleRuntime(RUNTIME_KEY, [
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
                  { name: 'options', data: runtimeOptions, json: true },
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
                ])

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

        const HtmlWebpackPluginInUse = compiler.options.plugins.find(
          (plugin) => plugin.constructor.name === 'HtmlWebpackPlugin'
        )

        compilation.hooks.processAssets.tap(
          {
            name: PLUGIN_NAME,
            stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
          },
          sesEmitHook({
            compilation,
            HtmlWebpackPluginInUse,
            HtmlWebpackPluginInterop: options.HtmlWebpackPluginInterop,
          })
        )

        // TODO: add later hooks to optionally verify correctness and totality
        // of wrapping for the paranoid mode.
      }
    )
  }
}

LavaMoatPlugin.exclude = EXCLUDE_LOADER

module.exports = LavaMoatPlugin
