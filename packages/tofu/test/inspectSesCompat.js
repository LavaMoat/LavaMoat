const test = require('tape')
const { parse, inspectSesCompat } = require('../src/index')

function inspectSesCompatTest (code) {
  return inspectSesCompat(parse(code))
}

test('inspectSesCompat - intrinsicMutations', (t) => {
  const results = inspectSesCompatTest(`
    Error.stackTraceLimit = 42
  `)
  t.deepEqual(results.intrinsicMutations, [])
  t.end()
})
