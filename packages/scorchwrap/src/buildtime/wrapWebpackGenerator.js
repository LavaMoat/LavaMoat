// @ts-check

/**
 * @param {object} options
 */
exports.wrapGeneratorMaker = ({ ignores, runChecks }) => {
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
      return generatorInstance;
    }
    const originalGenerate = generatorInstance.generate;
    /**
     *
     * @param {NormalModule} module
     * @param {*} options - GeneratorOptions type not exported fromw ebpack
     * @returns {Source}
     */
    generatorInstance.generate = function (module, options) {
      console.error(">>>G");
      diag.rawDebug(4, {
        module,
        options,
      });
      // using this in webpack.config.ts complained about some mismatch
      // @ts-ignore
      const originalGeneratedSource = originalGenerate.apply(this, arguments);
      // originalGenerate adds requirements to options.runtimeRequirements

      // skip doing anything if marked as ignored by the ignoreLoader
      if (module.loaders.some(({ loader }) => loader === IGNORE_LOADER)) {
        ignores.push(module.rawRequest);
        diag.rawDebug(3, `skipped wrapping ${module.rawRequest}`);
        return originalGeneratedSource;
      }

      // Turn off "use strict" being added in front of modules on final wrapping by webpack.
      // If anything attempts to reverse it, we want to ignore it
      if (
        module.buildInfo.strict === true ||
        module.buildInfo.strict === undefined // seems like it's possible for generation to run more than once for the same module
      ) {
        Object.defineProperty(module.buildInfo, "strict", {
          get: () => false,
          set: () => {
            console.warn(
              "Attempted to set strict mode on module",
              module.rawRequest,
              Error().stack
            );
          },
        });
      }

      const packageId = fakeAA(module.request);

      let { before, after, source, sourceChanged } = wrapper({
        // There's probably a good reason why webpack stores source in those objects instead
        // of strings. Turning it into a string here might mean we're loosing some caching.
        // Wrapper checks if transforms changed the source and indicates it, so that we can
        // decide if we want to keep the original object representing it.
        source: originalGeneratedSource.source().toString(),
        id: packageId,
        runtimeKit: processRequirements(options.runtimeRequirements, module),
        runChecks,
        evalKitFunctionName: `__webpack_require__.${RUNTIME_KEY}.E`,
      });

      diag.rawDebug(3, {
        packageId,
        requirements: options.runtimeRequirements,
        sourceChanged,
      });

      // using this in webpack.config.ts complained about made up issues
      if (sourceChanged) {
        // @ts-ignore
        return /** @type {Source} */ new ConcatSource(before, source, after);
      } else {
        // @ts-ignore
        return /** @type {Source} */ new ConcatSource(
          before,
          // @ts-ignore
          originalGeneratedSource,
          after
        );
      }
    };
    generatorInstance.generate.scorchwrap = true;
    return generatorInstance;
  };
};
