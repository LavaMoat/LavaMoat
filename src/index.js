const fs = require('fs')
const generatePrelude = require('./generatePrelude')
const createCustomPack = require('./browser-pack')
const { createConfigSpy } = require('./generateConfig')
const { wrapIntoBundle } = require('./sourcemaps')


/*  export a Browserify plugin  */
module.exports = function (browserify, pluginOpts) {
  // setup the plugin in a re-bundle friendly way
  browserify.on('reset', setupPlugin)
  setupPlugin()

  // override browserify/browser-pack prelude
  function setupPlugin() {
    const customPack = createSesifyPacker(pluginOpts)
    // replace the standard browser-pack with our custom packer
    browserify.pipeline.splice('pack', 1, customPack)
    if (pluginOpts.autoConfig) {
      browserify.pipeline.splice('label', 0, createConfigSpy({
        onResult: pluginOpts.autoConfig,
      }))
    }
  }

}

module.exports.generatePrelude = generatePrelude
module.exports.createSesifyPacker = createSesifyPacker

function createSesifyPacker (opts) {
  const onSourcemap = opts.onSourcemap || (row => row.sourceFile)
  const defaults = {
    raw: true,
    prelude: generatePrelude(opts),
    generateModuleInitializer: (row) => {
      const wrappedBundle = wrapIntoBundle(row.source)
      const sourceMappingURL = onSourcemap(row, wrappedBundle)
      // for now, ignore new sourcemap and just append original filename 
      let moduleInitSrc = wrappedBundle.code
      if (sourceMappingURL) moduleInitSrc += `\n//# sourceMappingURL=${sourceMappingURL}`
      return escapeCodeAsString(moduleInitSrc)
    },
  }

  const packOpts = Object.assign({}, defaults, opts)
  const customPack = createCustomPack(packOpts)
  return customPack
}

function escapeCodeAsString (source) {
  const escapedSource = source
    .split('\\').join('\\\\')
    .split('$').join('\\$')
    .split('`').join('\\`')
  return `\`${escapedSource}\``
}
