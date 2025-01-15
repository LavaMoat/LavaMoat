/** @typedef {import('webpack').Generator} Generator */
/** @typedef {import('webpack').NormalModule} NormalModule */
/** @typedef {import('webpack').sources.Source} Source */

const {
  sources: { ConcatSource },
} = require('webpack')
const { wrapper } = require('./wrapper.js')
const diag = require('./diagnostics.js')

// @ts-ignore // this one doesn't have official types
const RUNTIME_GLOBALS = require('webpack/lib/RuntimeGlobals')
const { RUNTIME_KEY } = require('../ENUM.json')

const { isExcluded } = require('./exclude')

// TODO: There's potential for a few more flags in runtimeFlags if we want to support all things webpack supports. Proceed with common sense.
// Look in JavascriptModulesPlugin for how it decides if module and exports are unused.
/**
 * @param {Set<string>} requirements
 * @param {NormalModule} module
 * @returns
 */
function processRequirements(requirements, module) {
  const runtimeKit = new Set()
  const runtimeFlags = {}

  for (const requirement of requirements) {
    // requirements can be more precise than just `module` - webpck will list nested fields in requirements, meanwhile we're only interested in passing the top level references.
    const requirementReferenceName = requirement.split('.')[0]
    if (requirementReferenceName === RUNTIME_GLOBALS.thisAsExports) {
      runtimeFlags.thisAsExports = true
      continue
    }
    if (requirementReferenceName === RUNTIME_GLOBALS.returnExportsFromRuntime) {
      // TODO: should be doable to introduce support in wrapper.js by conditionally adding a return statement. feels too niche to support
      continue
    }
    if (requirementReferenceName === '__webpack_exports__') {
      runtimeKit.add(module.exportsArgument)
    } else if (requirementReferenceName === 'module') {
      runtimeKit.add(module.moduleArgument)
    } else {
      runtimeKit.add(requirementReferenceName)
    }
  }
  diag.run(2, () => {
    runtimeKit.add(`/* ${Array.from(requirements).join()} */`)
  })

  return { runtimeKit, runtimeFlags }
}

// Use a weakset to mark generatorInstance as wrapped,
// this is to avoid wrapping the same instance twice
const wrappedGeneratorInstances = new WeakSet()

/**
 * @param {object} options
 * @param {string[]} options.excludes
 * @param {(path: string) => string | undefined} options.getIdentifierForPath
 * @param {boolean | undefined} options.runChecks
 * @param {import('./progress').ProgressAPI} options.PROGRESS
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
    // And there aren't any official or private hooks that would give us access to runtime requirements that I could find.

    if (wrappedGeneratorInstances.has(generatorInstance)) {
      return generatorInstance
    }
    const originalGenerate = generatorInstance.generate
    /**
     * @param {NormalModule} module
     * @param {any} options - GeneratorOptions type not exported fromw ebpack
     * @returns {Source}
     */
    generatorInstance.generate = function (module, options) {
      diag.rawDebug(5, {
        module,
        options,
      })

      // used to be .apply(this, arguments) but typescript complained. I feel it's worse that way
      const originalGeneratedSource = originalGenerate.call(
        this,
        module,
        options
      )

      // bail out if we're dealing with a subcompilation from a plugin and such - they may run too early
      if (!PROGRESS.done('pathsProcessed')) {
        return originalGeneratedSource
      }

      // skip doing anything if marked as excluded by the excludeLoader
      if (isExcluded(module)) {
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
              Error().stack
            )
          },
        })
      }

      const packageId = getIdentifierForPath(module.resource)
      if (packageId === undefined) {
        throw Error(`Failed to find a packageId for ${module.resource}`)
      }

      const { runtimeKit, runtimeFlags } = processRequirements(
        options.runtimeRequirements,
        module
      )

      let { before, after, source, sourceChanged } = wrapper({
        // There's probably a good reason why webpack stores source in those objects instead
        // of strings. Turning it into a string here might mean we're loosing some caching.
        // Wrapper checks if transforms changed the source and indicates it, so that we can
        // decide if we want to keep the original object representing it.
        source: originalGeneratedSource.source().toString(),
        id: packageId,
        runtimeKit,
        runChecks,
        evalKitFunctionName: `__webpack_require__.${RUNTIME_KEY}`,
        runtimeFlags,
      })

      diag.rawDebug(3, {
        packageId,
        requirements: options.runtimeRequirements,
        sourceChanged,
      })

      PROGRESS.report('generatorCalled')

      // using this in webpack.config.ts complained about made up issues
      if (sourceChanged) {
        return new ConcatSource(before, source, after)
      } else {
        return new ConcatSource(before, originalGeneratedSource, after)
      }
    }
    wrappedGeneratorInstances.add(generatorInstance)
    return generatorInstance
  }
}
