const browserify = require('browserify')
const lavamoatPlugin = require('../../src/index')

browserify([], {
  plugin: [
    [lavamoatPlugin, { 
      writeAutoConfig: true,
      writeAutoConfigDebug: true
    }]
  ]
}).bundle()
