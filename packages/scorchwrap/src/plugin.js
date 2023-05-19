// @ts-check

/** @typedef {import("webpack").Compiler} Compiler */
/** @typedef {import("webpack").Compilation} Compilation */
/** @typedef {import("webpack").Generator} Generator */
/** @typedef {import("webpack").sources.Source} Source */

/** @typedef {object} ScorchWrapPluginOptions
 * @property {boolean} [runChecks] - check resulting code with wrapping for correctnesss
 * @property {number} [diagnosticsVerbosity] - a number representing diagnostics output verbosity, the larger the more overwhelming
 */

const path = require("path");
const {
  NormalModule,
  WebpackError,
  NormalModuleReplacementPlugin,
  // ModuleDependency,
} = require("webpack");
const { wrapper } = require("./wrapper");
const diag = require("./diagnostics");

const { ConcatSource, RawSource } = require("webpack-sources");
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

const RUNTIME_PATH = "./_LM_RUNTIME_"; //path.resolve(__dirname, "./runtime.js");

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

      // TODO: find a nicer way to do it maybe?
      if (module.rawRequest === RUNTIME_PATH) {
        return originalGeneratedSource;
      }
      // if(module.loaders[0] && module.loaders[0].loader.includes('node_modules/css-loader/dist/cjs.js')) {
      // if (module.rawRequest.includes("node_modules/css-loader/dist/")) {
      //   console.error(">>>", module.rawRequest, module.loaders);
      //   return originalGeneratedSource;
      // }

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

      let { before, after, source, sourceChanged } = wrapper({
        // There's probably a good reason why webpack stores source in those objects instead
        // of strings. Turning it into a string here might mean we're loosing some caching.
        // Wrapper checks if transforms changed the source and indicates it, so that we can
        // decide if we want to keep the original object representing it.
        source: originalGeneratedSource.source().toString(),
        id: packageId,
        runtimeKit: processRequirements(options.runtimeRequirements, module),
        runChecks,
        evalKitFunctionName: `__webpack_require__('${RUNTIME_PATH}')`,
      });

      diag.rawDebug(3, {
        packageId,
        requirements: options.runtimeRequirements,
        sourceChanged,
      });

      // isEntryModule is deprecated and breaks bacause no chunk graph available
      // if(shouldGenerateRuntime && module.isEntryModule()){
      //   shouldGenerateRuntime = false;
      //   // add the runtime once.
      //   before = `
      //   window.__LM__ = window.__LM__ || ()=>{
      //     console.log('works')
      //   };
      //   `+before;
      // }

      if (module.rawRequest.includes("node_modules/css-loader/dist/")) {
        before = "debugger;" + before;
      }

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

    // this.replacementPlugin = new NormalModuleReplacementPlugin(
    //   /_LM_RUNTIME_/,
    //   RUNTIME_PATH
    // );
  }
  /**
   * @param {Compiler} compiler the compiler instance
   * @returns {void}
   */
  apply(compiler) {
    // Concatenation won't work with wrapped modules. Have to disable it.
    compiler.options.optimization.concatenateModules = false;
    // TODO: Research. If we fiddle a little with how we wrap the module, it might be possible to get inlining to work eventually.

    // this.replacementPlugin.apply(compiler);

    // compiler.options.module.rules.push({
    //   test(req) {
    //     if (
    //       allowedPaths.some((p) => req.includes(path.join(compiler.context, p)))
    //     ) {
    //       return /\.(js|jsx|ts|tsx|md|mdx|mjs)$/i.test(req);
    //     }
    //     return false;
    //   },
    //   include: compiler.context,
    //   exclude: [
    //     /node_modules/,
    //   ],
    //   loader: path.resolve(__dirname, './lruntime-oader.js'),
    //   options: {
            // policy:
            //   this.options.policy
    //    },
    // });

    // compiler.hooks.compilation.tap('EntryDependencyPlugin', (compilation) => {
    //   compilation.hooks.buildModule.tap('EntryDependencyPlugin', (module) => {
    //     // Check if this is the entry module
    //     if (module.isEntryModule()) {
    //       // Add a dependency on lodash
    //       console.error('aaaaa');
    //       const dep = new ModuleDependency();
    //       dep.request = '_LM_RUNTIME_';
    //       module.addDependency(dep);
    //     }
    //   });
    // });


    compiler.options.entry.main.import.unshift(RUNTIME_PATH);

    let mainCompilationWarnings;

    compiler.hooks.thisCompilation.tap(
      PLUGIN_NAME,
      (compilation, { normalModuleFactory }) => {
        if (!mainCompilationWarnings) {
          mainCompilationWarnings = compilation.warnings;
          mainCompilationWarnings.push(
            new WebpackError(
              "ScorchWrapPlugin: Concatenation of modules disabled - not compatible with LavaMoat wrapped modules."
            )
          );
        }
        if (compilation.compiler.isChild()) {
          if (
            compilation.compiler.name?.startsWith("mini-css-extract-plugin")
          ) {
            // Check if it's a child compilation used by a specific plugin
            // TODO: make the list of plugins configurable.
            mainCompilationWarnings.push(
              new WebpackError(
                "ScorchWrapPlugin: SKIPPING child compilation for" + compilation.compiler.name
              )
            );
            return;
          } else {
            mainCompilationWarnings.push(
              new WebpackError(
                "ScorchWrapPlugin: Entered child compilation for " + compilation.compiler.name
              )
            );
          }
        }

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

        // =================
        const MOD_NAME = "_LM_RUNTIME_";

        // compilation.hooks.resolve.tapAsync(
        //   'LMLMResolverPlugin',
        //   (request, resolveContext, callback) => {
        //     if (request.request === MOD_NAME || request.rawRequest === MOD_NAME) {
        //       console.error('zzz', request  )
        //       const resolvedPath = path.resolve(__dirname, './runtime.js');
        //       // Update the resolved request path
        //       request.request = resolvedPath;
        //     }
        //     callback();
        //   }
        // );

        // compilation.hooks.additionalChunkAssets.tap("PLUGIN_NAME", () => {
        //   console.error(">>>", 1);
        //   const source = 'console.error("$$$")';

        //   const moduleFactory = compilation.moduleFactory;

        //   // Create a module from a string
        //   const module = moduleFactory.create({
        //     type: "javascript/auto",
        //     request: "./string-module.js",
        //     userRequest: "./string-module.js",
        //     rawSource: 'export default "Hello world!";',
        //   });

        //   // Add the module to a chunk
        //   compilation.chunks.forEach((chunk) => {
        //     chunk.addModule(module);
        //   });
        //   // const module = new compilation.moduleFactory.create({
        //   //   type: "javascript/auto",
        //   //   request: MOD_NAME,
        //   //   userRequest: MOD_NAME,
        //   // });

        //   // compilation.addModule(
        //   //   new RawSource(source),
        //   //   {
        //   //     identifier: ()=>MOD_NAME,
        //   //     type: 'javascript/auto'
        //   //   }
        //   // );
        //   // compilation.chunks.forEach((chunk) => {
        //   //   chunk.addModule(RawSource(source));
        //   //   chunk.addModuleDependencies([module]);
        //   //   console.error(">>>");
        //   // });
        // });

        let mmm = null;

        // normalModuleFactory.hooks.createModule.tap(PLUGIN_NAME, (module) => {
        //   console.error(">>", module.rawRequest);

        //   if (!mmm) {
        //     mmm = module;

        //     const customModuleDependency = new module.constructor.Dependency(
        //       module.userRequest
        //     );

        //     // Add the dependency to the module
        //     module.dependencies.push(customModuleDependency);

        //     // Resolve the module request
        //     const resolvedModule = normalModuleFactory.resolverFactory
        //       .get("normal")
        //       .resolveSync({}, "", "/path/to/customModule.js");

        //     // Update the module's resource and context
        //     module.resource = resolvedModule;
        //     module.context = "";

        //     // Return the modified module
        //     return module;

        //     const stringModule = new NormalModule({
        //       request: MOD_NAME,
        //       context: module.context,
        //       rawRequest: MOD_NAME,
        //       resource: MOD_NAME,
        //       parser: module.parser,
        //       generator: module.generator,
        //       // generator: {generate: ()=>{
        //       //   return new RawSource(`console.error('$$$')`);
        //       // }},
        //       type: "javascript/auto",
        //       userRequest: MOD_NAME,
        //       loaders: [],
        //     });
        //     stringModule.buildInfo = {
        //       strict: false,
        //     };

        //     // Set the module code for the newly created module
        //     stringModule._source = new RawSource(`console.error('$$$')`);

        //     // Add the new module to the compilation
        //     compilation.modules.add(stringModule);
        //   }
        // });

        // compilation.hooks.buildModule.tap(PLUGIN_NAME, (module) => {
        //   // if(require('util').inspect(module).includes("./node_modules/@chainsafe/persistent-merkle-tree/lib/gindex.js")) {
        //     // }
        //     if(!mmm){
        //       mmm= module;
        //         console.error('>>>', module)

        //     const MOD_NAME = '_LM_RUNTIME_';
        //     const stringModule = new NormalModule({
        //       request: MOD_NAME,
        //       context: mmm.context,
        //       rawRequest: MOD_NAME,
        //       resource: MOD_NAME,
        //       parser: mmm.parser,
        //       generator: mmm.generator,
        //       // generator: {generate: ()=>{
        //       //   return new RawSource(`console.error('$$$')`);
        //       // }},
        //       type: "javascript/auto",
        //       userRequest: MOD_NAME,
        //       loaders: [],
        //     });
        //     stringModule._isEvaluatingSideEffects = true;
        //     stringModule.buildInfo = {
        //       strict: false,
        //     };

        //     // Set the module code for the newly created module
        //     stringModule._source = new RawSource(`console.error('$$$')`);

        //     // Add the new module to the compilation
        //     compilation.modules.add(stringModule);
        //   }
        // });

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
