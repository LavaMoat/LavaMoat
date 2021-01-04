const browserify = require('browserify')
const lavamoatPlugin = require('../../src/index')
const path = require('path')

browserify([path.resolve(__dirname, '../../examples/01-simple-js/index.js')], {
  plugin: [
    [lavamoatPlugin]
  ]
}).bundle().pipe(process.stdout)