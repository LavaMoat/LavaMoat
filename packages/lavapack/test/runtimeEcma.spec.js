const test = require('ava')
const fs = require('node:fs')
const espree = require('espree')

const ECMA_VERSION = 2020;

test('runtime.js parses as ECMA 2020', (t) => {
  const code = fs.readFileSync(require.resolve('../src/runtime.js'), 'utf8')
  t.notThrows(() => {
    espree.parse(code, {
    ecmaVersion: ECMA_VERSION,
    })
  })
})
