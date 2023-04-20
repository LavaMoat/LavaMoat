/** @typedef {import("webpack").Compiler} Compiler */
/** @typedef {import("webpack").Compilation} Compilation */
/** @typedef {import("webpack").WebpackError} WebpackError */
/** @typedef {import("webpack").Asset} Asset */
// const {
//   JAVASCRIPT_MODULE_TYPE_AUTO,
//   JAVASCRIPT_MODULE_TYPE_DYNAMIC,
//   JAVASCRIPT_MODULE_TYPE_ESM,
// } = require("webpack/lib/Module");

const { getWrapping } = require("./wrapper");

const ConcatSource = require("webpack-sources").ConcatSource;

const JAVASCRIPT_MODULE_TYPE_AUTO = 'javascript/auto';
const JAVASCRIPT_MODULE_TYPE_DYNAMIC = 'javascript/dynamic';
const JAVASCRIPT_MODULE_TYPE_ESM = 'javascript/esm';

function hackascriptgenerator(g) {
  const a = g.generate;
  g.generate = function (module, options) {
    // console.error('_________________________')
    // console.error(module)
    // console.error(options)
    const r = a.apply(this, arguments);
    // console.error(">>>", r);
    const wrapping = getWrapping({
      source: r,
      id: module.rawRequest,
      runtimeKit: Array.from(options.runtimeRequirements),
      runChecks: false,
    })
    // console.error({wrapping})
    return new ConcatSource(...wrapping);
  };
  return g;
}

const PLUGIN_NAME = "ReplaceJavascriptGeneratorPlugin";

function generatorTap(g) {
  console.error({ g });
  return g
}

class ReplaceJavascriptGeneratorPlugin {
  /**
   * Apply the plugin
   * @param {Compiler} compiler the compiler instance
   * @returns {void}
   */
  apply(compiler) {
    compiler.hooks.compilation.tap(
      PLUGIN_NAME,
      (compilation, { normalModuleFactory }) => {
      // compiler.hooks.normalModuleFactory.tap(PLUGIN_NAME, (normalModuleFactory) => {

        normalModuleFactory.hooks.generator
          .for(JAVASCRIPT_MODULE_TYPE_AUTO)
          .tap(PLUGIN_NAME, hackascriptgenerator);
        normalModuleFactory.hooks.generator
          .for(JAVASCRIPT_MODULE_TYPE_DYNAMIC)
          .tap(PLUGIN_NAME, hackascriptgenerator);
        normalModuleFactory.hooks.generator
          .for(JAVASCRIPT_MODULE_TYPE_ESM)
          .tap(PLUGIN_NAME, hackascriptgenerator);
      }
    );
    return;
    compiler.hooks.compilation.tap('MyWebpackPlugin', (compilation) => {
      compilation.hooks.optimizeChunkAssets.tap('MyWebpackPlugin', (chunks) => {
      console.log((compilation.dependencyTemplates._map.forEach(a=>console.error('___',a))));
        chunks.forEach((chunk) => {
          const modules = chunk.getModules();

          // loop through the modules and access the template context for each dependency
          modules.forEach((module) => {
            const dependencies = module.dependencies;

            // loop through the dependencies and access the template context
            dependencies.forEach((dependency) => {
              console.log({dependency })
              const templateContext = compilation.dependencyTemplates.get(dependency.constructor);

              console.error(templateContext.initFragments)
            });
          });
        });
      });
    });
    return 
   
    compiler.hooks.compilation.tap('MyPlugin', (compilation) => {
      compilation.moduleTemplates.javascript.hooks.render.tap(
        'MyPlugin',
        (source, module) => {
          if (module.dependencyTemplates) {
            module.dependencyTemplates.forEach((template) => {
              if (template && typeof template.hooks === 'object') {
                template.hooks.render.tap(
                  'MyPlugin',
                  (source, dependency, templateContext) => {
                    // access the initFragments array from templateContext
                    console.error('zzz', templateContext.initFragments )
                    templateContext.initFragments.push('/*ZZZ*/');
                    return source;
                  }
                );
              }
            });
          }
          return source;
        }
      );
    });
  }
}

module.exports = ReplaceJavascriptGeneratorPlugin;
