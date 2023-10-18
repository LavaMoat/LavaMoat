// @ts-check
const { readFileSync } = require('fs')
const {
  sources: { RawSource },
} = require('webpack')

module.exports = {
  sesEmitHook:
    ({ compilation, HtmlWebpackPluginInUse, HtmlWebpackPluginInterop }) =>
    () => {
      // Read the file you want to add to the output
      const sesFile = readFileSync(require.resolve('ses'), 'utf-8')
      const asset = new RawSource(sesFile)

      compilation.emitAsset('lockdown.js', asset)

      if (HtmlWebpackPluginInUse && HtmlWebpackPluginInterop) {
        HtmlWebpackPluginInUse.constructor
          .getHooks(compilation)
          .beforeEmit.tapAsync('LavaMoatWebpackPlugin-lockdown', (data, cb) => {
            data.html = data.html.replace(
              /<head[^>]*>/,
              '$&<script src="./lockdown.js"></script>'
            )
            cb(null, data)
          })
      }
    },
}
