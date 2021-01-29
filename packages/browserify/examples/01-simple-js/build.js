const fs = require('fs')
const browserify = require('browserify')

// configure LavaMoat
const lavamoatOpts = {
  policy: './policy.json'
}

// enable policy autogen if specified
if (process.env.AUTOCONFIG) {
  lavamoatOpts.writeAutoPolicy = true
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