// @ts-check

/** @typedef {import("webpack").Compiler} Compiler */
/** @typedef {import("webpack").Compilation} Compilation */
/** @typedef {import("webpack").WebpackError} WebpackError */
/** @typedef {import("webpack").Asset} Asset */

class LavaMoatPlugin {
  constructor(options) {
    if (typeof options !== "object") options = {};
    this.options = options;
  }

  /**
   * Apply the plugin
   * @param {Compiler} compiler the compiler instance
   * @returns {void}
   */
  apply(compiler) {
    // const { _backCompat: backCompat } = compiler;
    compiler.hooks.compilation.tap("LavaMoatPlugin", (compilation) => {
      const moduleGraph = compilation.moduleGraph;

      compilation.hooks.buildModule.tap("LavaMoatPlugin", (module) => {
        module
      });
    });
  }
}
