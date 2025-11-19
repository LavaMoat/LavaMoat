// if `mock` is not present in the `node:test` package, `laverna.spec.js` should be skipped

const config = {
  files: ['test/cli.spec.js'],
}

try {
  if (require('node:test').mock) {
    config.files.push('test/laverna.spec.js')
  } else {
    console.error('[SKIP] Laverna tests skipped - too old Node.js version')
  }
} catch {}

module.exports = config
