// if `mock` is not present in the `node:test` package, `laverna.spec.js` should be skipped

const config = {
  files: ['test/cli.spec.js'],
}

try {
  if (require('node:test').mock) {
    config.files.push('test/laverna.spec.js')
  }
} catch {}

module.exports = config
