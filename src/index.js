const fs = require('fs')
const sesifyPrelude = fs.readFileSync(__dirname + '/prelude.js', 'utf8')

/*  export a Browserify plugin  */
module.exports = function (browserify, pluginOpts) {
  // override browserify/browser-pack prelude
  browserify._options.prelude = sesifyPrelude
  // force reinstantiation of browser-pack
  browserify.reset()
}

module.exports.prelude = sesifyPrelude
