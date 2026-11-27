/** @import {Compilation, WebpackPluginInstance} from 'webpack' */

const { readFileSync } = require('node:fs')
const {
  sources: { RawSource, ConcatSource },
} = require('webpack')

const lockdownSource = readFileSync(require.resolve('ses'), 'utf-8')
const lockdownSourcePrefix = `/*! SES sources included by LavaMoat. Do not optimize or minify. */\n;\n${lockdownSource}\n;/*! end SES */\n`

module.exports = {
  /**
   * @param {object} options
   * @param {Compilation} options.compilation
   * @param {RegExp} options.inlineLockdown
   * @returns {() => void}
   */
  sesPrefixFiles:
    ({ compilation, inlineLockdown }) =>
    () => {
      for (const file in compilation.assets) {
        if (!inlineLockdown.test(file)) {
          continue
        }
        const asset = compilation.assets[file]
        compilation.assets[file] = new ConcatSource(lockdownSourcePrefix, asset)
      }
    },
  /**
   * @param {object} options
   * @param {Compilation} options.compilation
   * @param {WebpackPluginInstance} [options.HtmlWebpackPluginInUse]
   * @param {boolean} [options.HtmlWebpackPluginInterop]
   * @param {{ getCompilationHooks: Function }} [options.NativeHtmlPlugin] webpack's built-in HtmlModulesPlugin, if this webpack version ships one
   * @returns {() => void}
   */
  sesEmitHook:
    ({
      compilation,
      HtmlWebpackPluginInUse,
      HtmlWebpackPluginInterop,
      NativeHtmlPlugin,
    }) =>
    () => {
      // TODO: to consider: instead manually copy to compiler.options.output.path
      const asset = new RawSource(lockdownSource)

      compilation.emitAsset('lockdown', asset)

      if (NativeHtmlPlugin && HtmlWebpackPluginInterop) {
        // webpack's built-in html support (experiments.html). Tapping is harmless
        // when the feature is disabled, the hooks are simply never called.
        NativeHtmlPlugin.getCompilationHooks(compilation).injectTags.tap(
          'LavaMoatWebpackPlugin-lockdown',
          (/** @type {object[]} */ tags) => [
            {
              tag: 'script',
              attrs: { src: './lockdown' },
              // placed before any other script
              injectTo: 'head-prepend',
            },
            ...tags,
          ]
        )
      }

      if (HtmlWebpackPluginInUse && HtmlWebpackPluginInterop) {
        HtmlWebpackPluginInUse.constructor
          // @ts-expect-error - incomplete types
          .getHooks(compilation)
          .beforeEmit.tapAsync(
            'LavaMoatWebpackPlugin-lockdown',
            (
              /** @type {{ html: string }} */ data,
              /** @type {(arg0: null, arg1: any) => void} */ cb
            ) => {
              const scriptTag = '<script src="./lockdown"></script>'
              const headTagRegex = /<head[^>]*>/iu
              const scriptTagRegex = /<script/iu

              if (headTagRegex.test(data.html)) {
                data.html = data.html.replace(headTagRegex, `$&${scriptTag}`)
              } else if (scriptTagRegex.test(data.html)) {
                data.html = data.html.replace(scriptTagRegex, `${scriptTag}$&`)
              } else {
                throw Error(
                  'LavaMoatPlugin: Could not insert lockdown script tag, no suitable location found in the html template'
                )
              }
              cb(null, data)
            }
          )
      }
    },
}
