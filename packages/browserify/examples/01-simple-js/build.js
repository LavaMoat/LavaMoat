const fs = require('fs')
const browserify = require('browserify')

// configure LavaMoat
const lavamoatOpts = {
  config: './lavamoat-config.json'
}

// enable config autogen if specified
if (process.env.AUTOCONFIG) {
  lavamoatOpts.writeAutoConfig = true
}

// configure browserify
const bundler = browserify(['./index.js'], {
  plugin: [
    ['lavamoat-browserify', lavamoatOpts]
  ]
})

// bundle and write to disk
bundler.bundle()
  .pipe(fs.createWriteStream('./bundle.js'))