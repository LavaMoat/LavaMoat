const fs = require('fs')
const browserify = require('browserify')
const { pipeline } = require('stream')

// "autogen": "--plugin [ lavamoat-browserify --writeAutoConfig --config ./lavamoat-config.json ] > /dev/null",
// "default": "--plugin [ lavamoat-browserify --config ./lavamoat-config.json ] > bundle.js",
// "harden": "--plugin [ lavamoat-browserify --config ./lavamoat-config-harden.json ] > bundle.js",
// "unsafe": "> bundle.js",
const buildTarget = process.env.TARGET
const useLavamoat = buildTarget !== 'unsafe'
const configPath = buildTarget === 'harden' ? './lavamoat-config-harden.json' : './lavamoat-config.json'
const destPath = buildTarget === 'autogen' ? '/dev/null' : './bundle.js'
const writeAutoConfig = buildTarget === 'autogen'

// bugfix: globally replace readable-stream
const builtins = require('browserify/lib/builtins')
builtins['readable-stream/readable.js'] = require.resolve('readable-stream-patch/lib/_stream_readable.js')
builtins['readable-stream/writable.js'] = require.resolve('readable-stream-patch/lib/_stream_writable.js')
builtins['readable-stream/duplex.js'] = require.resolve('readable-stream-patch/lib/_stream_duplex.js')
builtins['readable-stream/transform.js'] = require.resolve('readable-stream-patch/lib/_stream_transform.js')
builtins['readable-stream/passthrough.js'] = require.resolve('readable-stream-patch/lib/_stream_passthrough.js')

const plugin = []

// add lavamoat
if (useLavamoat) {
  plugin.push(['lavamoat-browserify', {
    writeAutoConfig,
    config: configPath,
  }])
}

// configure bundler
const bundler = browserify(['./entry.js'], {
  builtins,
  plugin,
})

console.log({ buildTarget, useLavamoat, configPath, destPath, writeAutoConfig })

// build
pipeline(
  bundler.bundle(),
  fs.createWriteStream(destPath),
)