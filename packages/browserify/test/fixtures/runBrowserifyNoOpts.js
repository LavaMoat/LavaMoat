#!/usr/bin/env node
const browserify = require('browserify')
const lavamoatPlugin = require('../../src/index')

browserify(process.argv.slice(2), {
  plugin: [
    [lavamoatPlugin]
  ]
}).bundle().pipe(process.stdout)
