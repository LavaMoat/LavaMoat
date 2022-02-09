const browserify = require('browserify')
const lavamoatPlugin = require(process.env.PLUGIN_PATH)

browserify([], {
  plugin: [
    [lavamoatPlugin, { 
      writeAutoPolicy: true,
      writeAutoPolicyDebug: true
    }]
  ],
  debug: true,
}).bundle()
