const fs = require('fs')
const generatePrelude = require('./generatePrelude')
const createCustomPack = require('./browser-pack')

/*  export a Browserify plugin  */
module.exports = function (browserify, pluginOpts) {
  // override browserify/browser-pack prelude
  const defaults = {
    raw: true,
    prelude: generatePrelude(pluginOpts),
    // prelude: 'console.log',
  }

  defaults.generateModuleInitializer = function (row) {
    const moduleInitSrc = [
      `//# sourceURL=${row.sourceFile}`,
      '(function(require,module,exports){',
      // combineSourceMap.removeComments(row.source),
      row.source,
      '})',
    ].join('\n')
    return escapeCodeAsString(moduleInitSrc)
  }

  function escapeCodeAsString (source) {
    const escapedSource = source
      .split('\\').join('\\\\')
      .split('$').join('\\$')
      .split('`').join('\\`')
    return `\`${escapedSource}\``
  }

  const opts = Object.assign({}, browserify._options, defaults, pluginOpts)
  const customPack = createCustomPack(opts)
  // replace the standard browser-pack with our custom packer
  browserify.pipeline.splice('pack', 1, customPack)
}

module.exports.prelude = generatePrelude()
module.exports.generatePrelude = generatePrelude
