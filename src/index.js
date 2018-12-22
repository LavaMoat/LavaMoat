const fs = require('fs')
const generatePrelude = require('./generatePrelude')

/*  export a Browserify plugin  */
module.exports = function (browserify, pluginOpts) {
  // override browserify/browser-pack prelude
  browserify._options.prelude = generatePrelude()
  // force reinstantiation of browser-pack to take new prelude
  browserify.reset()
}

module.exports.prelude = generatePrelude()
