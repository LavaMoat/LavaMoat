const { readFileSync } = require('node:fs')
const {
  sources: { RawSource, ConcatSource },
} = require('webpack')

const lockdownSource = readFileSync(require.resolve('ses'), 'utf-8')
const lockdownSourcePrefix = `/*! SES sources included by LavaMoat. Do not optimize or minify. */\n;\n${lockdownSource}\n;/*! end SES */\n`

module.exports = {
  /**
   * @param {object} options
   * @param {import('webpack').Compilation} options.compilation
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
   * @param {import('webpack').Compilation} options.compilation
   * @param {import('webpack').WebpackPluginInstance} [options.HtmlWebpackPluginInUse]
   * @param {boolean} [options.HtmlWebpackPluginInterop]
   * @returns {() => void}
   */
  sesEmitHook:
    ({ compilation, HtmlWebpackPluginInUse, HtmlWebpackPluginInterop }) =>
    () => {
      // TODO: to consider: instead manually copy to compiler.options.output.path
      const asset = new RawSource(lockdownSource)

      compilation.emitAsset('lockdown', asset)

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
                  'LavaMoat: Could not insert lockdown script tag, no suitable location found in the html template'
                )
              }
              cb(null, data)
            }
          )
      }
    },
}
