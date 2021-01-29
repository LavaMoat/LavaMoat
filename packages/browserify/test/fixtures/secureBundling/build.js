const browserify = require('browserify')
const lavamoatPlugin = require('../../../src/index')
const path = require('path')

// configure LavaMoat
const lavamoatOpts = {
  policy: path.resolve(__dirname, '../exampleApp/policy.json'),
  policyOverride: path.resolve(__dirname, '../exampleApp/policy-override.json')
}

// configure browserify
const bifyOpts = Object.assign({}, lavamoatPlugin.args)
const bundler = browserify([path.resolve(__dirname, '../exampleApp/bundleEntry.js')], bifyOpts)
bundler.plugin(lavamoatPlugin, lavamoatOpts)

// bundle
bundler.bundle()
  .pipe(process.stdout)