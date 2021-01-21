#!/usr/bin/env node
const browserify = require('browserify')
const lavamoatPlugin = require('../../src/index')

const params = JSON.parse(process.argv[2])

browserify(params.entries, {
  ...lavamoatPlugin.args,
  plugin: [
    [lavamoatPlugin, params.opts],
    params.createPacker && ['bify-package-factor', params.createPacker]
  ]
}).bundle().pipe(process.stdout)
