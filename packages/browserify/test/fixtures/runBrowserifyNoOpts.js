const browserify = require('browserify')
const lavamoatPlugin = require('../../src/index')

browserify([], {
  plugin: [
    [lavamoatPlugin]
  ]
}).bundle().pipe(process.stdout)
