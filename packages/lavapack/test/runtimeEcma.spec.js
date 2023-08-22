const test = require('ava')
const fs = require('node:fs')
const espree = require('espree')

const ECMA_VERSION = 2020

test('runtime.js parses as ECMA 2020', (t) => {
  const code = fs.readFileSync(require.resolve('../src/runtime.js'), 'utf8')
  try {
    t.notThrows(() => {
      espree.parse(code, {
        ecmaVersion: ECMA_VERSION,
      })
    })
  } catch (err) {
    const { message, lineNumber, column } = err
    console.error(message, `at line ${lineNumber}, column ${column}`)
    console.error(`Failed to parse runtime.js as ECMA ${ECMA_VERSION}`)
    throw err
  }
})
