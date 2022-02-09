const browserify = require('browserify')
const lavamoatPlugin = require('../../../src/index')
const path = require('path')

const writeAutoPolicy = Boolean(process.env.WRITE_AUTO_POLICY)

const projectRoot = path.resolve(__dirname, '../exampleApp')

// configure LavaMoat
const lavamoatOpts = {
  policy: path.resolve(__dirname, '../exampleApp/policy.json'),
  policyOverride: path.resolve(__dirname, '../exampleApp/policy-override.json'),
  writeAutoPolicy,
  // projectRoot id different than current working dir so we specify
  projectRoot,
}

// configure browserify
const bifyOpts = Object.assign({ debug: true }, lavamoatPlugin.args)
const entryPath = path.join(__dirname, '..', 'exampleApp', 'bundleEntry.js')
const bundler = browserify([entryPath], bifyOpts)
bundler.plugin(lavamoatPlugin, lavamoatOpts)

// bundle
bundler.bundle()
  .pipe(process.stdout)