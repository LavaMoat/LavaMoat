const test = require('ava')
const { evaluateCapabilities } = require('../src/endowmentsToolkit.js')

test('single defineCapability call registers capability in map', (t) => {
  const source = `defineCapability('my-cap', { ambient: false, endow() {} })`
  const { capabilities } = evaluateCapabilities({
    sources: [source],
    globalRef: {},
  })
  t.true(capabilities.has('my-cap'))
  t.is(capabilities.size, 1)
})

test('multiple defineCapability calls in one source are all registered', (t) => {
  const source = `
    defineCapability('cap-a', { ambient: false, endow() {} })
    defineCapability('cap-b', { ambient: true, endow() {} })
  `
  const { capabilities } = evaluateCapabilities({
    sources: [source],
    globalRef: {},
  })
  t.true(capabilities.has('cap-a'))
  t.true(capabilities.has('cap-b'))
  t.is(capabilities.size, 2)
})

test('repair callback is collected in the repairs array', (t) => {
  const source = `repair(() => {})`
  const { repairs } = evaluateCapabilities({ sources: [source], globalRef: {} })
  t.is(repairs.length, 1)
  t.is(typeof repairs[0], 'function')
})

test('repair callback receives globalRef when executed', (t) => {
  const globalRef = { theRealGlobal: true }
  // The callback returns its argument so we can verify what it received
  const source = `repair((g) => g)`
  const { repairs } = evaluateCapabilities({ sources: [source], globalRef })
  t.is(repairs[0](), globalRef)
})

test('duplicate capability name across sources throws error', (t) => {
  const source1 = `defineCapability('my-cap', { ambient: false, endow() {} })`
  const source2 = `defineCapability('my-cap', { ambient: false, endow() {} })`
  t.throws(
    () => evaluateCapabilities({ sources: [source1, source2], globalRef: {} }),
    { message: /duplicate capability name "my-cap"/ }
  )
})

test('defineCapability with unknown name does not throw', (t) => {
  const source = `defineCapability('not-declared-anywhere', { ambient: false, endow() {} })`
  t.notThrows(() => evaluateCapabilities({ sources: [source], globalRef: {} }))
})

test('empty sources array returns empty results', (t) => {
  const { repairs, capabilities } = evaluateCapabilities({
    sources: [],
    globalRef: {},
  })
  t.deepEqual(repairs, [])
  t.is(capabilities.size, 0)
})

test('capability source that throws at evaluation time produces error with context', (t) => {
  const source = `throw new Error('bad capability source')`
  const err = t.throws(() =>
    evaluateCapabilities({ sources: [source], globalRef: {} })
  )
  t.regex(err.message, /error evaluating capability source at index 0/)
  t.regex(err.message, /bad capability source/)
})

test('capability source is evaluated in strict mode', (t) => {
  const source = `
    const thisValue = this
    const strict = (function () { return this === undefined })()
    defineCapability('cap', {
      ambient: false,
      endow({ endowments }) {
        endowments.thisValue = thisValue
        endowments.strict = strict
      },
    })
  `
  const { capabilities } = evaluateCapabilities({
    sources: [source],
    globalRef: {},
  })
  const endowments = {}
  capabilities.get('cap').endow({
    options: [],
    endowments,
    compartmentGlobalThis: {},
    rootCompartmentGlobalThis: {},
  })
  t.is(endowments.thisValue, undefined)
  t.true(endowments.strict)
})

test('extra globals are available to the capability source', (t) => {
  const sentinel = { isSentinel: true }
  const compartmentGlobalThis = {}
  const rootCompartmentGlobalThis = {}
  const source = `defineCapability('cap', {
    ambient: false,
    endow({
      options,
      endowments,
      compartmentGlobalThis,
      rootCompartmentGlobalThis,
    }) {
      endowments.result = myGlobal
      endowments.option = options[0]
      endowments.compartmentGlobalThis = compartmentGlobalThis
      endowments.rootCompartmentGlobalThis = rootCompartmentGlobalThis
    },
  })`
  globalThis.myGlobal = sentinel // has access to an actual global
  const { capabilities } = evaluateCapabilities({
    sources: [source],
    globalRef: {},
  })
  const endowments = {}
  capabilities.get('cap').endow({
    options: [sentinel],
    endowments,
    compartmentGlobalThis,
    rootCompartmentGlobalThis,
  })
  t.is(endowments.result, sentinel)
  t.is(endowments.option, sentinel)
  t.is(endowments.compartmentGlobalThis, compartmentGlobalThis)
  t.is(endowments.rootCompartmentGlobalThis, rootCompartmentGlobalThis)
})
