const test = require('tape')
const { parse, inspectEnvironment, environmentTypes } = require('../src/index')

test('inspectEnvironment - basic', (t) => {
  const environment = inspectEnvironmentTest(`
    'hello world'
  `)
  t.deepEqual(environment, environmentTypes.frozen)
  t.end()
})

test('inspectEnvironment - assignment to toString on prototype', (t) => {
  const environment = inspectEnvironmentTest(`
    MyClass.prototype.toString = () => 'hello'
  `)
  t.deepEqual(environment, environmentTypes.frozen)
  t.end()
})

test('inspectEnvironment - assignment to toString', (t) => {
  const environment = inspectEnvironmentTest(`
    exports.toString = () => 'hello'
  `)
  t.deepEqual(environment, environmentTypes.frozen)
  t.end()
})

test('inspectEnvironment - assignment to frozen primordial', (t) => {
  const environment = inspectEnvironmentTest(`
    Array.prototype.bogoSort = () => 'hello'
  `)
  t.deepEqual(environment, environmentTypes.unfrozen)
  t.end()
})

test('inspectEnvironment - primordial potential false positive', (t) => {
  const environment = inspectEnvironmentTest(`
    window.Array === Array
  `)
  t.deepEqual(environment, environmentTypes.frozen)
  t.end()
})

test('inspectEnvironment - primordial potential false positive', (t) => {
  const environment = inspectEnvironmentTest(`
    const args = Array.prototype.slice.call(arguments)
  `)
  t.deepEqual(environment, environmentTypes.frozen)
  t.end()
})

test('inspectEnvironment - primordial modify property', (t) => {
  const environment = inspectEnvironmentTest(`
    Object.keys.extra = 'hello'
  `)
  t.deepEqual(environment, environmentTypes.unfrozen)
  t.end()
})

function inspectEnvironmentTest (code) {
  return inspectEnvironment(parse(code))
}

test('inspectEnvironment - primordial Error modify property', (t) => {
  const environment = inspectEnvironmentTest(`
    Error.prepareStackTrace = () => {}
  `)
  t.deepEqual(environment, environmentTypes.unfrozen)
  t.end()
})