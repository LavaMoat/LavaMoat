// @ts-check

/** @typedef {import("webpack").Generator} Generator */
/** @typedef {import("webpack").NormalModule} NormalModule */
/** @typedef {import("webpack").sources.Source} Source */

const path = require('path')
const {
  sources: { ConcatSource },
} = require('webpack')
const { wrapper } = require('./wrapper.js')
const diag = require('./diagnostics.js')

// @ts-ignore // this one doesn't have official types
const RUNTIME_GLOBALS = require('webpack/lib/RuntimeGlobals')
const { RUNTIME_KEY } = require('../ENUM.json')

const EXCLUDE_LOADER = path.join(__dirname, '../excludeLoader.js')

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


// Use a weakset to mark generatorInstance as wrapped,
// this is to avoid wrapping the same instance twice
const wrappedGeneratorInstances = new WeakSet()

// TODO: this should probably be extracted to a separate file for easier navigation
/**
 * @param {object} options
 */
exports.wrapGeneratorMaker = ({
  excludes,
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

    if (wrappedGeneratorInstances.has(generatorInstance)) {
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

      const originalGeneratedSource =originalGenerate.apply(this, arguments)

      // bail out if we're dealing with a subcompilation from a plugin and such - they may run too early
      if (!PROGRESS.done('pathsProcessed')) {
        return originalGeneratedSource
      }

      // skip doing anything if marked as excluded by the excludeLoader,
      // only accept exclude loader from config, not inline.
      // Inline loader definition uses a `!` character as a loader separator. 
      // Defining what to exclude should only be possible in the config.
      if (module.loaders.some(({ loader }) => loader === EXCLUDE_LOADER) && !module.rawRequest.includes('!')) {
        excludes.push(module.rawRequest)
        diag.rawDebug(3, `skipped wrapping ${module.rawRequest}`)
        return originalGeneratedSource
      }

      // originalGenerate adds requirements to options.runtimeRequirements. runtimeKit needs to be derived from those.
      // We also depend on __webpack_require__ being there, so let's add it
      options.runtimeRequirements.add('__webpack_require__')

      // Turn off "use strict" being added in front of modules on final wrapping by webpack.
      // If anything attempts to reverse it, we want to ignore it
      if (
        module.buildInfo && // never found an actual case in which buildInfo wasn't there, but types suggest it's possible
        (module.buildInfo.strict === true ||
          module.buildInfo.strict === undefined) // seems like it's possible for generation to run more than once for the same module
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
        return new ConcatSource(before, source, after)
      } else {
        return new ConcatSource(
          before,
          originalGeneratedSource,
          after,
        )
      }
    }
    wrappedGeneratorInstances.add(generatorInstance)
    return generatorInstance
  }
}
