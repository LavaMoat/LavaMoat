// @ts-check

/** @typedef {import("webpack").Compiler} Compiler */
/** @typedef {import("webpack").Compilation} Compilation */
/** @typedef {import("webpack").Generator} Generator */
/** @typedef {import("webpack").sources.Source} Source */

/** @typedef {object} ScorchWrapPluginOptions
 * @property {boolean} [runChecks] - check resulting code with wrapping for correctnesss
 * @property {number} [diagnosticsVerbosity] - a number representing diagnostics output verbosity, the larger the more overwhelming
 */

const { NormalModule, WebpackError } = require("webpack");
const { wrapper } = require("./wrapper");
const diag = require("./diagnostics");

const ConcatSource = require("webpack-sources").ConcatSource;
// @ts-ignore // this one doesn't have official types
const RUNTIME_GLOBALS = require("webpack/lib/RuntimeGlobals");

// TODO: upcoming version of webpack may expose these constants
// https://github.com/webpack/webpack/blob/07ac43333654280c5bc6014a3a69eda4c3b80273/lib/ModuleTypeConstants.js
// const {
//   JAVASCRIPT_MODULE_TYPE_AUTO,
//   JAVASCRIPT_MODULE_TYPE_DYNAMIC,
//   JAVASCRIPT_MODULE_TYPE_ESM,
// } = require("webpack/lib/ModuleTypeConstants");
const JAVASCRIPT_MODULE_TYPE_AUTO = "javascript/auto";
const JAVASCRIPT_MODULE_TYPE_DYNAMIC = "javascript/dynamic";
const JAVASCRIPT_MODULE_TYPE_ESM = "javascript/esm";

/**
 * @param {string} path
 * @returns
 */
const fakeAA = (path) => {
  // TODO: properly resolve what belongs to which compartment
  let chunks = path.split("node_modules/");
  chunks[0] = "app";
  chunks = chunks.map((chunk) => {
    // only keep the @scope/package or package name
    const parts = chunk.split("/");
    if (parts[0].startsWith("@")) {
      return parts.slice(0, 2).join("/");
    }
    return parts[0];
  });
  return chunks.join(">");
};

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
  const runtimeKit = new Set();
  for (const requirement of requirements) {
    const chunks = requirement.split(".");
    if (chunks[0] === RUNTIME_GLOBALS.thisAsExports) {
      // TODO: not sure what to do with it.
      //github.com/webpack/webpack/blob/07ac43333654280c5bc6014a3a69eda4c3b80273/lib/javascript/JavascriptModulesPlugin.js#L560
      continue;
    }
    if (chunks[0] === RUNTIME_GLOBALS.returnExportsFromRuntime) {
      // should be doable to introduce support elsewhere
      // TODO: create an indicator of this requirement that our runtime would understand
      continue;
    }
    if (chunks[0] === "__webpack_exports__") {
      runtimeKit.add(module.exportsArgument);
    }
    if (chunks[0] === "module") {
      runtimeKit.add(module.moduleArgument);
    }
    runtimeKit.add(chunks[0]);
  }
  diag.run(2, () => {
    runtimeKit.add(`/* ${Array.from(requirements).join()} */`);
  });

  return runtimeKit;
}

/**
 * @param {ScorchWrapPluginOptions} options
 */
const wrapGeneratorMaker = ({ runChecks }) => {
  /**
   * @param {Generator} generatorInstance
   * @returns {Generator}
   */
  return function wrapGenerator(generatorInstance) {
    // Monkey-patching JavascriptGenerator. Yes, this could be nicer.
    // Using features of the generator itself we might be able to achieve the same
    // but it would be more suseptible to changes in webpack.
    const originalGenerate = generatorInstance.generate;
    /**
     *
     * @param {NormalModule} module
     * @param {*} options - GeneratorOptions type not exported fromw ebpack
     * @returns {Source}
     */
    generatorInstance.generate = function (module, options) {
      diag.rawDebug(4, {
        module,
        options,
      });
      // using this in webpack.config.ts complained about some mismatch
      // @ts-ignore
      const originalGeneratedSource = originalGenerate.apply(this, arguments);
      // originalGenerate adds requirements to options.runtimeRequirements

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

      const packageId = fakeAA(module.rawRequest);

      const { before, after, source, sourceChanged } = wrapper({
        // There's probably a good reason why webpack stores source in those objects instead
        // of strings. Turning it into a string here might mean we're loosing some caching.
        // Wrapper checks if transforms changed the source and indicates it, so that we can
        // decide if we want to keep the original object representing it.
        source: originalGeneratedSource.source().toString(),
        id: packageId,
        runtimeKit: processRequirements(options.runtimeRequirements, module),
        runChecks,
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
    return generatorInstance;
  };
};

const PLUGIN_NAME = "ScorchWrapPlugin";

class ScorchWrapPlugin {
  /**
   * @constructor
   * @param {ScorchWrapPluginOptions} [options]
   */
  constructor(options = {}) {
    this.options = options;
    diag.level = options.diagnosticsVerbosity || 0;
  }
  /**
   * @param {Compiler} compiler the compiler instance
   * @returns {void}
   */
  apply(compiler) {
    // Concatenation won't work with wrapped modules. Have to disable it.
    compiler.options.optimization.concatenateModules = false;
    // TODO: Research. If we fiddle a little with how we wrap the module, it might be possible to get inlining to work eventually.

    compiler.hooks.compilation.tap(
      PLUGIN_NAME,
      (compilation, { normalModuleFactory }) => {
        compilation.warnings.push(
          new WebpackError(
            "ScorchWrapPlugin: Concatenation of modules disabled - not compatible with LavaMoat wrapped modules."
          )
        );
        const runChecks = this.options.runChecks || diag.level > 0;
        normalModuleFactory.hooks.generator
          .for(JAVASCRIPT_MODULE_TYPE_AUTO)
          .tap(
            PLUGIN_NAME,
            wrapGeneratorMaker({
              runChecks,
            })
          );
        normalModuleFactory.hooks.generator
          .for(JAVASCRIPT_MODULE_TYPE_DYNAMIC)
          .tap(
            PLUGIN_NAME,
            wrapGeneratorMaker({
              runChecks,
            })
          );
        normalModuleFactory.hooks.generator.for(JAVASCRIPT_MODULE_TYPE_ESM).tap(
          PLUGIN_NAME,
          wrapGeneratorMaker({
            runChecks,
          })
        );

        // TODO: add later hooks to optionally verify correctness and totality
        // of wrapping for the paranoid mode.
      }
    );

    // Another way to get close to where we need to make changes:
    // compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
    //   const JavascriptModulesPlugin = compiler.webpack.javascript.JavascriptModulesPlugin
    //   const hooks = JavascriptModulesPlugin.getCompilationHooks(compilation);
    //   hooks.renderModuleContent.tap(
    //     PLUGIN_NAME,
    //     (moduleSource, module, ctx) => {
    //       console.error({ moduleSource, module, ctx });
    //     }
    //   );
    // });
  }
}

module.exports = ScorchWrapPlugin;
