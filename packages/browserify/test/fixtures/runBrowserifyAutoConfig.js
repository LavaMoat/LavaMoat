const browserify = require('browserify')
const lavamoatPlugin = require('../../src/index')

browserify([], {
  plugin: [
    [lavamoatPlugin, { 
      writeAutoPolicy: true,
      writeAutoPolicyDebug: true
    }]
  ]
}).bundle()
