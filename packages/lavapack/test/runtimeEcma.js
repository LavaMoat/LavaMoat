const ECMA_VERSION = 2020

const fs = require('fs')
const path = require('path')
const espree = require('espree')
console.log(`
TEST: Parsing runtime.js as ECMA ${ECMA_VERSION}`)
const code = fs.readFileSync(path.join(__dirname, '../src/runtime.js'), 'utf8')
try {
  espree.parse(code, {
    ecmaVersion: ECMA_VERSION,
  })
} catch (err) {
  const { stack, message, lineNumber, column } = err
  console.error(message, `at line ${lineNumber}, column ${column}`)
  console.error(`Failed to parse runtime.js as ECMA ${ECMA_VERSION}`)
  process.exit(1)
}
