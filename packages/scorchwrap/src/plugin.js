/** @typedef {import("webpack").Compiler} Compiler */
/** @typedef {import("webpack").Compilation} Compilation */
/** @typedef {import("webpack").WebpackError} WebpackError */
/** @typedef {import("webpack").Asset} Asset */

const { getWrapping } = require("./wrapper");

const ConcatSource = require("webpack-sources").ConcatSource;

// TODO: figure out where to get those from
const JAVASCRIPT_MODULE_TYPE_AUTO = "javascript/auto";
const JAVASCRIPT_MODULE_TYPE_DYNAMIC = "javascript/dynamic";
const JAVASCRIPT_MODULE_TYPE_ESM = "javascript/esm";

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
function processRequirements(requirements) {
  const runtimeKit = new Set();
  for (const requirement of requirements) {
    const chunks = requirement.split(".");
    if(chunks[0]==='top-level-this-exports') {
      // not sure what to do with that
      continue;
    }
    runtimeKit.add(chunks[0]);
  }
  return runtimeKit;
}

function wrapGenerator(generatorInstance) {
  // Yes, this could be nicer.
  // Using features of the generator itself we might be able to achieve the same
  // but it would be more suseptible to changes in webpack.
  const originalGenerate = generatorInstance.generate;
  generatorInstance.generate = function (module, options) {
    // console.error('_________________________')
    // console.error(module)

    // originalGenerate adds requirements to options.runtimeRequirements
    const generatedSource = originalGenerate.apply(this, arguments);
    // console.error(options.runtimeRequirements);
    // console.error(generatedSource);
    const wrapping = getWrapping({
      // There's probably a good reason why webpack stores source in those objects instead of strings. Turning it into a string here might mean we're loosing some caching.
      // It should be possible to create a smarter version of the wrapper that would check if SES transforms were applied and preserve the original source object if not.
      source: generatedSource.source(),
      id: fakeAA(module.rawRequest),
      runtimeKit: processRequirements(options.runtimeRequirements),
      runChecks: true,
    });

    // Turns off "use strict" being added in front of modules on final wrapping.
    // If anything attempts to reverse it, we want to ignore it
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
    return new ConcatSource(...wrapping);
  };
  return generatorInstance;
}

const PLUGIN_NAME = "ScorchWrapPlugin";

class ScorchWrapPlugin {
  /**
   * Apply the plugin
   * @param {Compiler} compiler the compiler instance
   * @returns {void}
   */
  apply(compiler) {
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
    // return
    compiler.hooks.compilation.tap(
      PLUGIN_NAME,
      (compilation, { normalModuleFactory }) => {

        normalModuleFactory.hooks.generator
          .for(JAVASCRIPT_MODULE_TYPE_AUTO)
          .tap(PLUGIN_NAME, wrapGenerator);
        normalModuleFactory.hooks.generator
          .for(JAVASCRIPT_MODULE_TYPE_DYNAMIC)
          .tap(PLUGIN_NAME, wrapGenerator);
        normalModuleFactory.hooks.generator
          .for(JAVASCRIPT_MODULE_TYPE_ESM)
          .tap(PLUGIN_NAME, wrapGenerator);
      }
    );
  }
}

module.exports = ScorchWrapPlugin;
