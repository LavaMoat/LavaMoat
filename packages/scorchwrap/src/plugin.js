// @ts-check

/** @typedef {import("webpack").Compiler} Compiler */
/** @typedef {import("webpack").Compilation} Compilation */
/** @typedef {import("webpack").Generator} Generator */
/** @typedef {import("webpack").sources.Source} Source */
/** @typedef {import("./types.js").ScorchWrapPluginOptions} ScorchWrapPluginOptions */

const path = require('path')
const {
  NormalModule,
  WebpackError,
  RuntimeGlobals,
  RuntimeModule,
  // ModuleDependency,
} = require('webpack')
const { wrapper } = require('./buildtime/wrapper')
const { generateIdentifierLookup } = require('./buildtime/aa')
const diag = require('./buildtime/diagnostics')
const progress = require('./buildtime/progress')

const { readFileSync } = require('fs')
const { ConcatSource } = require('webpack-sources')

// @ts-ignore // this one doesn't have official types
const RUNTIME_GLOBALS = require('webpack/lib/RuntimeGlobals')
const { loadCanonicalNameMap } = require('@lavamoat/aa')

// TODO: upcoming version of webpack may expose these constants
// https://github.com/webpack/webpack/blob/07ac43333654280c5bc6014a3a69eda4c3b80273/lib/ModuleTypeConstants.js
// const {
//   JAVASCRIPT_MODULE_TYPE_AUTO,
//   JAVASCRIPT_MODULE_TYPE_DYNAMIC,
//   JAVASCRIPT_MODULE_TYPE_ESM,
// } = require("webpack/lib/ModuleTypeConstants");
const JAVASCRIPT_MODULE_TYPE_AUTO = 'javascript/auto'
const JAVASCRIPT_MODULE_TYPE_DYNAMIC = 'javascript/dynamic'
const JAVASCRIPT_MODULE_TYPE_ESM = 'javascript/esm'

const RUNTIME_KEY = '_LM_'
const IGNORE_LOADER = path.join(__dirname, './ignoreLoader.js')

// TODO: processing requirements needs to be a tiny bit more clever yet.
// Look in JavascriptModulesPlugin for how it decides if module and exports are unused.
/**
 *
 * @param {Set<string>} requirements
 * @param {NormalModule} module
 * @returns
 */
function processRequirements(requirements, module) {
  // TODO: the approach of passing a runtimneKit is a minimal solution.
  // It may be possible to do more at compile time to simplify the runtime.
  // Handling "thisAsExports" may require that.
  const runtimeKit = new Set()
  for (const requirement of requirements) {
    const chunks = requirement.split('.')
    if (chunks[0] === RUNTIME_GLOBALS.thisAsExports) {
      // TODO: not sure what to do with it.
      //github.com/webpack/webpack/blob/07ac43333654280c5bc6014a3a69eda4c3b80273/lib/javascript/JavascriptModulesPlugin.js#L560
      continue
    }
    if (chunks[0] === RUNTIME_GLOBALS.returnExportsFromRuntime) {
      // should be doable to introduce support elsewhere
      // TODO: create an indicator of this requirement that our runtime would understand
      continue
    }
    if (chunks[0] === '__webpack_exports__') {
      runtimeKit.add(module.exportsArgument)
    } else if (chunks[0] === 'module') {
      runtimeKit.add(module.moduleArgument)
    } else {
      runtimeKit.add(chunks[0])
    }
  }
  diag.run(2, () => {
    runtimeKit.add(`/* ${Array.from(requirements).join()} */`)
  })

  return runtimeKit
}

// TODO: this should probably be extracted to a separate file for easier navigation
/**
 * @param {object} options
 */
const wrapGeneratorMaker = ({
  ignores,
  getIdentifierForPath,
  runChecks,
  PROGRESS,
}) => {
  /**
   * @param {Generator} generatorInstance
   * @returns {Generator}
   */
  return function wrapGenerator(generatorInstance) {
    // Monkey-patching JavascriptGenerator. Yes, this could be nicer.
    // Using features of the generator itself we might be able to achieve the same
    // but it would be more suseptible to changes in webpack.

    // TODO: consider turning that into a weakset too
    if (generatorInstance.generate.scorchwrap) {
      return generatorInstance
    }
    const originalGenerate = generatorInstance.generate
    /**
     *
     * @param {NormalModule} module
     * @param {*} options - GeneratorOptions type not exported fromw ebpack
     * @returns {Source}
     */
    generatorInstance.generate = function (module, options) {
      diag.rawDebug(5, {
        module,
        options,
      })

      // using this in webpack.config.ts complained about some mismatch
      // @ts-ignore
      const originalGeneratedSource = originalGenerate.apply(this, arguments)

      // bail out if we're dealing with a subcompilation from a plugin and such - they may run too early
      if (!PROGRESS.done('pathsProcessed')) {
        return originalGeneratedSource
      }

      // skip doing anything if marked as ignored by the ignoreLoader
      // TODO: what if someone specifies this loader inline in a require or import?
      if (module.loaders.some(({ loader }) => loader === IGNORE_LOADER)) {
        ignores.push(module.rawRequest)
        diag.rawDebug(3, `skipped wrapping ${module.rawRequest}`)
        return originalGeneratedSource
      }

      // originalGenerate adds requirements to options.runtimeRequirements. runtimeKit needs to be derived from those.
      // We also depend on __webpack_require__ being there, so let's add it
      options.runtimeRequirements.add('__webpack_require__')

      // Turn off "use strict" being added in front of modules on final wrapping by webpack.
      // If anything attempts to reverse it, we want to ignore it
      if (
        module.buildInfo.strict === true ||
        module.buildInfo.strict === undefined // seems like it's possible for generation to run more than once for the same module
      ) {
        Object.defineProperty(module.buildInfo, 'strict', {
          get: () => false,
          set: () => {
            // TODO: make the error more informative - explaining why the attempt to strict mode had to be skipped here but is applied anyway
            console.warn(
              'Attempted to set strict mode on module',
              module.rawRequest,
              Error().stack,
            )
          },
        })
      }

      const packageId = getIdentifierForPath(module.resource)
      if (packageId === undefined) {
        console.log(module)
        throw Error(`Failed to find a packageId for ${module.resource}`)
      }

      let { before, after, source, sourceChanged } = wrapper({
        // There's probably a good reason why webpack stores source in those objects instead
        // of strings. Turning it into a string here might mean we're loosing some caching.
        // Wrapper checks if transforms changed the source and indicates it, so that we can
        // decide if we want to keep the original object representing it.
        source: originalGeneratedSource.source().toString(),
        id: packageId,
        runtimeKit: processRequirements(options.runtimeRequirements, module),
        runChecks,
        evalKitFunctionName: `__webpack_require__.${RUNTIME_KEY}`,
      })

      diag.rawDebug(3, {
        packageId,
        requirements: options.runtimeRequirements,
        sourceChanged,
      })

      PROGRESS.report('gneratorCalled')

      // using this in webpack.config.ts complained about made up issues
      if (sourceChanged) {
        // @ts-ignore
        return /** @type {Source} */ new ConcatSource(before, source, after)
      } else {
        // @ts-ignore
        return /** @type {Source} */ new ConcatSource(
          before,
          // @ts-ignore
          originalGeneratedSource,
          after,
        )
      }
    }
    // @ts-ignore
    generatorInstance.generate.scorchwrap = true
    return generatorInstance
  }
}

class VirtualRuntimeModule extends RuntimeModule {
  constructor({ name, source }) {
    super(name)
    this.source = source
  }
  generate() {
    return this.source
  }
}

function removeMultilineComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '')
}

// Runtime modules are not being built nor wrapped by webpack, so I rolled my own tiny concatenator.
// It's using a shared namespace technique instead of scoping `exports` variables
// to avoid confusing anyone into believing it's actually CJS.
// Criticism will only be accepted in a form of working PR with less total lines and less magic.
const assembleRuntime = (KEY, runtimeModules) => {
  let assembly = 'const LAVAMOAT = Object.create(null);'
  runtimeModules.map(({ file, data, name, json, shimRequire }) => {
    let sourceString
    if (file) {
      sourceString = readFileSync(path.join(__dirname, file), 'utf-8')
    }
    if (data) {
      sourceString = JSON.stringify(data)
    }
    if (json) {
      sourceString = `LAVAMOAT['${name}'] = (${sourceString});`
    }
    if (shimRequire) {
      sourceString = readFileSync(require.resolve(shimRequire), 'utf-8')
      sourceString = removeMultilineComments(sourceString)
      sourceString = `;(()=>{
        const module = {exports: {}};
        const exports = module.exports;
          ${sourceString}
        ;
        LAVAMOAT['${name}'] = module.exports;
      })();`
    }
    assembly += `\n;/*${name}*/;\n${sourceString}`
  })
  assembly += `;
  __webpack_require__.${KEY} = LAVAMOAT.defaultExport;
  (typeof harden !== 'undefined') && harden(__webpack_require__.${KEY});` // The harden line is likely unnecessary as the handler is being frozen anyway
  return {
    addTo({ compilation, chunk }) {
      compilation.addRuntimeModule(
        chunk,
        new VirtualRuntimeModule({
          name: 'LavaMoat/runtime',
          source: assembly,
        }),
      )
    },
  }
}

// =================================================================
// Plugin code
// =================================================================

const PLUGIN_NAME = 'ScorchWrapPlugin'

class ScorchWrapPlugin {
  /**
   * @constructor
   * @param {ScorchWrapPluginOptions} [options]
   */
  constructor(options = { policy: {} }) {
    this.options = options

    diag.level = options.diagnosticsVerbosity || 0
  }
  /**
   * @param {Compiler} compiler the compiler instance
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
        'gneratorCalled:repeats',
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
    // compiler.options.optimization.runtimeChunk = false;
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
        }),
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
              'ScorchWrapPlugin: Concatenation of modules disabled - not compatible with LavaMoat wrapped modules.',
            ),
          )
        }

        // =================================================================
        // processin of the paths involved in the bundle and cross-check with policy

        const ignores = []
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

          chunks.forEach((chunk) => {
            chunkGraph.getChunkModules(chunk).forEach((module) => {
              const moduleId = chunkGraph.getModuleId(module)
              if (
                // Webpack has a concept of ignored modules
                // When a module is ignored a carveout is necessary in policy enforcement for it because the ID that webpack creates for it is not exactly helpful. 
                // example outcome in the bundle: `const nodeCrypto = __webpack_require__(/*! crypto */ "?0b7d");`
                // Sadly, even treeshaking doesn't eliminate that module. It's left there and failing to work when reached by runtime policy enforcement.
                // Below is the most reliable way I've found to date to identify ignored modules.
                (module.type === JAVASCRIPT_MODULE_TYPE_DYNAMIC &&
                  module.identifierStr &&
                  module.identifierStr.startsWith('ignored')) ||
                module.resource === undefined // better to explicitly list it as unenforceable than let it fall through the cracks
              ) {
                unenforceableModuleIds.push(moduleId)
              } else {
                knownPaths.push({ path: module.resource, moduleId }) // typescript is complaining about the use of `resource` here, but it's actually there.
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
                `ScorchWrapPlugin: the following module ids can't be controlled by policy and must be ignored at runtime: \n  ${unenforceableModuleIds.join()}`,
              ),
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

        // Hook into all types of JavaScript NormalModules
        for (const moduleType of coveredTypes) {
          normalModuleFactory.hooks.generator.for(moduleType).tap(
            PLUGIN_NAME,
            wrapGeneratorMaker({
              ignores,
              runChecks,
              getIdentifierForPath,
              PROGRESS,
            }),
          )
        }

        // Report on ignored modules as late as possible.
        // This hook happens after all module generators have been executed.
        compilation.hooks.afterProcessAssets.tap(PLUGIN_NAME, () => {
          diag.rawDebug(3, '> afterProcessAssets')
          mainCompilationWarnings.push(
            new WebpackError(
              `in ScorchWrapPlugin: ignored modules \n  ${ignores.join('\n  ')}`,
            ),
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
          (chunk, set) => {
            if (chunk.hasRuntime()) {
              if (!PROGRESS.done('gneratorCalled')) {
                mainCompilationWarnings.push(
                  new WebpackError(
                    'ScorchWrapPlugin: Something was generating runtime before all modules were identified. This might be part of a sub-compilation of a plugin. Please check for any unwanted interference between plugins.',
                  ),
                )
                diag.rawDebug(
                  1,
                  '> skipped adding runtime (additionalChunkRuntimeRequirements)',
                )
                // It's possible to generate the runtime with an empty policy to make the wrapped code work.
                // It's no longer necessasry now that `generate` function is only wrapping anything if paths were processed,
                // which corresponds to it being the main compilation. But plugins may exist that conflict with that assumption;
                // in which case we're gonna have to bring back the runtime with empty policy
              } else {
                diag.rawDebug(
                  1,
                  '> adding runtime (additionalChunkRuntimeRequirements)',
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
                  { name: 'ENUM', file: './ENUM.json', json: true },
                  {
                    name: 'endowmentsToolkit',
                    shimRequire:
                      'lavamoat-core/src/endowmentsToolkit.js',
                  },
                  { name: 'runtime', file: './runtime/runtime.js' },
                ])

                // If the chunk has already been processed, skip it.
                if (onceForChunkSet.has(chunk)) {
                  return
                }
                // set.add(RuntimeGlobals.onChunksLoaded); // TODO: develop an understanding of what this line does and why it was a part of the runtime setup for module federation

                // Mark the chunk as processed by adding it to the WeakSet.
                onceForChunkSet.add(chunk)

                // Add the runtime modules to the chunk, which handles
                // the runtime logic for wrapping with lavamoat.
                lavaMoatRuntime.addTo({
                  compilation,
                  chunk,
                })

                PROGRESS.report('runtimeAdded')
              }
            }
          },
        )

        // TODO: add later hooks to optionally verify correctness and totality
        // of wrapping for the paranoid mode.
      },
    )
  }
}

ScorchWrapPlugin.ignore = IGNORE_LOADER

module.exports = ScorchWrapPlugin
