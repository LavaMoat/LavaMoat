const { readFileSync } = require('node:fs')
const {
  sources: { RawSource },
} = require('webpack')

module.exports = {
  sesEmitHook:
    ({ compilation, HtmlWebpackPluginInUse, HtmlWebpackPluginInterop }) =>
    () => {
      const sesFile = readFileSync(require.resolve('ses'), 'utf-8')
      // TODO: to consider: instead manually copy to compiler.options.output.path
      const asset = new RawSource(sesFile)

      compilation.emitAsset('lockdown', asset)

      if (HtmlWebpackPluginInUse && HtmlWebpackPluginInterop) {
        HtmlWebpackPluginInUse.constructor
          .getHooks(compilation)
          .beforeEmit.tapAsync('LavaMoatWebpackPlugin-lockdown', (data, cb) => {
            const scriptTag = '<script src="./lockdown"></script>'
            const headTagRegex = /<head[^>]*>/iu
            const scriptTagRegex = /<script/iu

            if (headTagRegex.test(data.html)) {
              data.html = data.html.replace(headTagRegex, `$&${scriptTag}`)
            } else if (scriptTagRegex.test(data.html)) {
              data.html = data.html.replace(
                scriptTagRegex,
                `${scriptTag}<script`
              )
            } else {
              throw Error(
                'LavaMoat: Could not insert lockdown script tag, no suitable location found in the html template'
              )
            }
            cb(null, data)
          })
      }
    },
}
