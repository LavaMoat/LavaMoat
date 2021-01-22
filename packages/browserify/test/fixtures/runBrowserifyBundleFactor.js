#!/usr/bin/env node
const browserify = require('browserify')
const lavamoatPlugin = require('../../src/index')
const through = require('through2')
const vinylBuffer = require('vinyl-buffer')
const createCustomPack = require('../../src/createCustomPack')
const bifyPkgFactor = require('bify-package-factor')

const params = JSON.parse(process.argv[2])
const files = {}

function createPacker (opts) {
    return createCustomPack({
      ...opts,
      // omit prelude (still included in common bundle)
      includePrelude: false,
      // provide full bundle config
      config: {},
      // tell packer to automatically prune config
      pruneConfig: true
    })
  }

browserify(params.entries, {
  ...lavamoatPlugin.args,
  plugin: [
    [lavamoatPlugin, params.opts],
    [bifyPkgFactor, { createPacker }]
  ]
}).bundle().pipe(vinylBuffer()).pipe(through.obj(onFile, onDone))

function onFile(file, enc, callback) {
  const { relative, contents } = file
  if (file.isBuffer()) {
    files[relative] = contents.toString()
  } else {
    throw new Error('Unknown vinyl file type')
  }
  callback()
}

function onDone() {
  console.log(JSON.stringify(files))
}
