const acornGlobals = require('acorn-globals')
const { inspectEnvironment, environmentTypes } = require('../src/inspectEnvironment')
const { getTape } = require('./util')

const test = getTape()


test('inspectEnvironment - basic', async (t) => {
  const environment = inspectEnvironmentTest(`
    'hello world'
  `)
  t.deepEqual(environment, environmentTypes.frozen)
})

test('inspectEnvironment - assignment to toString on prototype', async (t) => {
  const environment = inspectEnvironmentTest(`
    MyClass.prototype.toString = () => 'hello'
  `)
  t.deepEqual(environment, environmentTypes.frozen)
})

test('inspectEnvironment - assignment to toString', async (t) => {
  const environment = inspectEnvironmentTest(`
    exports.toString = () => 'hello'
  `)
  t.deepEqual(environment, environmentTypes.frozen)
})

test('inspectEnvironment - assignment to frozen primordial', async (t) => {
  const environment = inspectEnvironmentTest(`
    Array.prototype.bogoSort = () => 'hello'
  `)
  t.deepEqual(environment, environmentTypes.unfrozen)
})

test('inspectEnvironment - primordial potential false positive', async (t) => {
  const environment = inspectEnvironmentTest(`
    window.Array === Array
  `)
  t.deepEqual(environment, environmentTypes.frozen)
})

test('inspectEnvironment - primordial potential false positive', async (t) => {
  const environment = inspectEnvironmentTest(`
    const args = Array.prototype.slice.call(arguments)
  `)
  t.deepEqual(environment, environmentTypes.frozen)
})

test('inspectEnvironment - primordial modify property', async (t) => {
  const environment = inspectEnvironmentTest(`
    Object.keys.extra = 'hello'
  `)
  t.deepEqual(environment, environmentTypes.unfrozen)
})

function inspectEnvironmentTest (code) {
  return inspectEnvironment(acornGlobals.parse(code))
}