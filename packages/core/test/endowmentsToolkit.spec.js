const test = require('ava')
const endowmentsToolkit = require('../src/endowmentsToolkit.js')

function prepareTest({ knownWritable } = {}) {
  const {
    getEndowmentsForConfig,
    copyWrappedGlobals,
    getBuiltinForConfig,
    attenuateBuiltin,
  } = endowmentsToolkit({
    handleGlobalWrite: !!knownWritable,
    knownWritableFields: knownWritable,
  })
  return {
    getEndowmentsForConfig,
    copyWrappedGlobals,
    getBuiltinForConfig,
    attenuateBuiltin,
  }
}

test('getEndowmentsForConfig', (t) => {
  const { getEndowmentsForConfig } = prepareTest()
  const sourceGlobal = {
    namespace: {
      stringValue: 'yabbadabbadoo',
    },
  }
  const config = {
    globals: {
      'namespace.stringValue.includes': true,
    },
  }
  const resultGlobal = getEndowmentsForConfig(sourceGlobal, config)
  t.is(sourceGlobal.namespace.stringValue.includes('dab'), true)
  t.is(resultGlobal.namespace.stringValue.includes('dab'), true)
})

test('getEndowmentsForConfig - function on proto', (t) => {
  const { getEndowmentsForConfig } = prepareTest()
  const assertMe = Symbol('assertMe')
  const appendChild = () => assertMe
  const theProto = {
    appendChild,
  }
  const sourceGlobal = {
    lookAtMyProto: Object.create(theProto),
  }
  const config = {
    globals: {
      'lookAtMyProto.appendChild': true,
    },
  }
  const resultGlobal = getEndowmentsForConfig(sourceGlobal, config)
  t.is(resultGlobal.lookAtMyProto.appendChild(), assertMe)
})

test('getEndowmentsForConfig - siblings', (t) => {
  const { getEndowmentsForConfig } = prepareTest()
  const sourceGlobal = { Buffer }
  const config = {
    globals: {
      'Buffer.from': true,
      'Buffer.isBuffer': true,
    },
  }
  const resultGlobal = getEndowmentsForConfig(sourceGlobal, config)
  {
    const sourceProp = Object.getOwnPropertyDescriptor(
      sourceGlobal.Buffer,
      'from'
    )
    const resultProp = Object.getOwnPropertyDescriptor(
      resultGlobal.Buffer,
      'from'
    )
    t.is(typeof resultProp.value, 'function')
    t.deepEqual(
      resultProp,
      {
        ...sourceProp,
        value: resultProp.value,
      },
      'prop descriptor matches (except value)'
    )
  }
  {
    const sourceProp = Object.getOwnPropertyDescriptor(
      sourceGlobal.Buffer,
      'isBuffer'
    )
    const resultProp = Object.getOwnPropertyDescriptor(
      resultGlobal.Buffer,
      'isBuffer'
    )
    t.is(typeof resultProp.value, 'function')
    t.deepEqual(
      resultProp,
      {
        ...sourceProp,
        value: resultProp.value,
      },
      'prop descriptor matches (except value)'
    )
  }
})

test('getEndowmentsForConfig - tightening access with false', (t) => {
  const { getEndowmentsForConfig } = prepareTest()
  const sourceGlobal = {
    a: { b: { c: 2, d: 3 }, q: 1 },
  }

  const config = {
    globals: {
      a: false,
      'a.q': true,
    },
  }

  const resultGlobal = getEndowmentsForConfig(sourceGlobal, config)
  {
    t.is(typeof resultGlobal.a, 'object')
    t.is(resultGlobal.a.b, undefined)
    t.is(resultGlobal.a.q, 1)
  }
})

test('getEndowmentsForConfig - knownWritable', (t) => {
  const knownWritable = new Set(['a', 'b', 'x'])
  const { getEndowmentsForConfig } = prepareTest({ knownWritable })
  const sourceGlobal = {
    a: 1,
    b: { c: 2 },
    d: 3,
  }
  const config = {
    globals: {
      a: true,
      'b.c': true,
      d: true,
    },
  }
  const resultGlobal = getEndowmentsForConfig(sourceGlobal, config)
  {
    t.is(resultGlobal.a, 1)
    t.is(resultGlobal.b.c, 2)
    t.is(resultGlobal.d, 3)
    t.is(resultGlobal.x, undefined)
    sourceGlobal.a = 11
    sourceGlobal.b = { c: 22 }
    sourceGlobal.d = 33
    t.is(resultGlobal.a, 11)
    t.is(resultGlobal.b.c, 22)
    t.is(resultGlobal.d, 3)
  }
})

test('instrumentDynamicValueAtPath puts a getter at path', (t) => {
  const { instrumentDynamicValueAtPath } = endowmentsToolkit._test

  const source = {
    a: { b: { c: 1 } },
  }
  const target = {}

  instrumentDynamicValueAtPath(['a', 'b', 'c'], source, target)

  t.is(
    typeof Object.getOwnPropertyDescriptor(target?.a?.b, 'c')?.get,
    'function'
  )
  t.is(target.a.b.c, 1)
  source.a.b.c = 2
  t.is(target.a.b.c, 2)
})

test('getEndowmentsForConfig - knownWritable and tightening access with false', (t) => {
  const knownWritable = new Set(['a'])
  const { getEndowmentsForConfig } = prepareTest({ knownWritable })
  const sourceGlobal = {
    a: { b: { c: 2, d: 3 }, q: 1 },
  }

  const config = {
    globals: {
      'a.b.c': true,
      'a.b': false,
      'a.q': true,
    },
  }

  const resultGlobal = getEndowmentsForConfig(sourceGlobal, config)
  {
    t.is(typeof resultGlobal.a.b, 'object')
    t.is(resultGlobal.a.b.c, 2)
    t.is(resultGlobal.a.b.d, undefined)
    t.is(resultGlobal.a.q, 1)
    sourceGlobal.a.b = { c: 22 }
    t.is(resultGlobal.a.b.c, 22)
  }
})

test('getEndowmentsForConfig - knownWritable and invalid nesting', (t) => {
  const knownWritable = new Set(['a'])
  const { getEndowmentsForConfig } = prepareTest({ knownWritable })
  const sourceGlobal = {
    a: { b: { c: 2, d: 3 }, q: 1 },
  }

  const config = {
    globals: {
      'a.b': true,
      'a.b.c': true,
      'a.q': true,
    },
  }

  t.throws(() => getEndowmentsForConfig(sourceGlobal, config))
})

test('getEndowmentsForConfig - read-write', (t) => {
  const knownWritable = new Set(['a', 'b'])
  const { getEndowmentsForConfig } = prepareTest({ knownWritable })
  const sourceGlobal = {
    a: 1,
    b: { c: 2 },
    d: 3,
  }
  const config1 = {
    globals: {
      a: true,
      'b.c': true,
      d: true,
    },
  }
  const config2 = {
    globals: {
      a: 'write',
      b: 'write',
    },
  }
  const global1 = getEndowmentsForConfig(sourceGlobal, config1)
  const global2 = getEndowmentsForConfig(sourceGlobal, config2)
  {
    t.is(global1.a, 1)
    t.is(global1.b.c, 2)
    t.is(global1.d, 3)
    t.is(global1.x, undefined)
    global2.a = 11
    global2.b = { c: 22 }
    global2.d = 33
    t.is(global1.a, 11)
    t.is(global1.b.c, 22)
    t.is(global1.d, 3)
  }
})

test('getEndowmentsForConfig - basic getter', (t) => {
  const { getEndowmentsForConfig } = prepareTest()
  const sourceGlobal = {
    get abc() {
      return { xyz: 42 }
    },
  }
  const config = {
    globals: {
      'abc.xyz': true,
    },
  }
  const resultGlobal = getEndowmentsForConfig(sourceGlobal, config)
  {
    const sourceProp = Object.getOwnPropertyDescriptor(sourceGlobal, 'abc')
    const resultProp = Object.getOwnPropertyDescriptor(resultGlobal, 'abc')
    t.deepEqual(resultProp.value, { xyz: 42 })
    const { enumerable, configurable } = sourceProp
    t.deepEqual(
      resultProp,
      {
        enumerable,
        configurable,
        value: resultProp.value,
        writable: true,
      },
      'prop descriptor matches (except value)'
    )
  }
})

test('getEndowmentsForConfig - traversing with getters', (t) => {
  // getEndowmentsForConfig traverses intermediate getters and preserves the leaf getter
  const { getEndowmentsForConfig } = prepareTest()
  let dynamicValue = 42
  const recur = (n) => () => {
    if (n === 0) return dynamicValue
    const obj = {}
    Object.defineProperty(obj, 'zzz', {
      get: recur(n - 1),
      enumerable: true,
    })
    return obj
  }

  const sourceGlobal = recur(3)()

  const config = {
    globals: {
      'zzz.zzz.zzz': true,
    },
  }
  const configShallow = {
    globals: {
      'zzz.zzz': true,
    },
  }
  const resultGlobal = getEndowmentsForConfig(sourceGlobal, config)
  const resultGlobalShallow = getEndowmentsForConfig(
    sourceGlobal,
    configShallow
  )

  {
    const getDescriptorKind = (obj, prop) => {
      const descriptor = Object.getOwnPropertyDescriptor(obj, prop)
      if (descriptor === undefined) return 'undefined'
      if (descriptor.get !== undefined) return 'getter'
      if (descriptor.value !== undefined) return 'value'
      return 'unknown'
    }
    const descriptors = [
      getDescriptorKind(resultGlobal, 'zzz'),
      getDescriptorKind(resultGlobal.zzz, 'zzz'),
      getDescriptorKind(resultGlobal.zzz.zzz, 'zzz'),
    ]
    const descriptorsShallow = [
      getDescriptorKind(resultGlobalShallow, 'zzz'),
      getDescriptorKind(resultGlobalShallow.zzz, 'zzz'),
      getDescriptorKind(resultGlobalShallow.zzz.zzz, 'zzz'),
    ]
    t.deepEqual(descriptors, ['value', 'value', 'getter'])
    t.deepEqual(descriptorsShallow, ['value', 'getter', 'getter'])
    t.is(resultGlobal.zzz.zzz.zzz, 42)
    t.is(resultGlobalShallow.zzz.zzz.zzz, 42)
    dynamicValue = 3
    t.is(resultGlobal.zzz.zzz.zzz, 3)
    t.is(resultGlobalShallow.zzz.zzz.zzz, 3)
  }
})

test('getEndowmentsForConfig - ensure window.document getter behavior support', (t) => {
  'use strict'
  // compartment.globalThis.document would error because 'this' value is not window
  const { getEndowmentsForConfig } = prepareTest()
  const sourceGlobal = {
    get xyz() {
      return this
    },
  }
  const config = {
    globals: {
      xyz: true,
    },
  }
  const resultGlobal = getEndowmentsForConfig(sourceGlobal, config)

  const getter = Reflect.getOwnPropertyDescriptor(resultGlobal, 'xyz').get

  t.is(resultGlobal.xyz, sourceGlobal)
  t.is(getter.call(resultGlobal), sourceGlobal)
  t.is(getter.call(sourceGlobal), sourceGlobal)
  // ava seems to be forcing sloppy mode
  t.is(getter.call(), globalThis)
})

test('getEndowmentsForConfig - specify unwrap to', (t) => {
  'use strict'
  // compartment.globalThis.document would error because 'this' value is not window
  const unwrapTo = {}
  const { getEndowmentsForConfig } = prepareTest()
  const sourceGlobal = {
    get xyz() {
      return this
    },
  }
  const config = {
    globals: {
      xyz: true,
    },
  }
  const resultGlobal = getEndowmentsForConfig(sourceGlobal, config, unwrapTo)
  const getter = Reflect.getOwnPropertyDescriptor(resultGlobal, 'xyz').get

  t.is(resultGlobal.xyz, unwrapTo)
  t.is(getter.call(resultGlobal), unwrapTo)
  t.is(getter.call(sourceGlobal), sourceGlobal)
  t.is(getter.call(unwrapTo), unwrapTo)
  // ava seems to be forcing sloppy mode
  t.is(getter.call(), globalThis)
})

test('getEndowmentsForConfig - specify unwrap from, unwrap to', (t) => {
  'use strict'
  // compartment.globalThis.document would error because 'this' value is not window
  const unwrapTo = {}
  const unwrapFrom = {}
  const { getEndowmentsForConfig } = prepareTest()
  const sourceGlobal = {
    get xyz() {
      return this
    },
  }
  const config = {
    globals: {
      xyz: true,
    },
  }
  const resultGlobal = getEndowmentsForConfig(
    sourceGlobal,
    config,
    unwrapTo,
    unwrapFrom
  )
  const getter = Reflect.getOwnPropertyDescriptor(resultGlobal, 'xyz').get

  t.is(resultGlobal.xyz, resultGlobal)
  t.is(getter.call(resultGlobal), resultGlobal)
  t.is(getter.call(sourceGlobal), sourceGlobal)
  t.is(getter.call(unwrapTo), unwrapTo)
  t.is(getter.call(unwrapFrom), unwrapTo)
  // ava seems to be forcing sloppy mode
  t.is(getter.call(), globalThis)
})

test('getEndowmentsForConfig - endowing bind of a function', async (t) => {
  'use strict'
  const { getEndowmentsForConfig } = prepareTest()
  const sourceGlobal = {
    abc: function () {
      return this
    },
  }
  const config = {
    globals: {
      'abc.bind': true,
    },
  }
  const resultGlobal = getEndowmentsForConfig(sourceGlobal, config)

  // the intermediate should actually be an object
  t.is(typeof resultGlobal.abc, 'object')
  // bind should work normally
  t.is(resultGlobal.abc.bind()(), undefined)
  t.is(resultGlobal.abc.bind(true)(), true)
  t.is(resultGlobal.abc.bind(42)(), 42)
  const xyz = {}
  t.is(resultGlobal.abc.bind(xyz)(), xyz)
})

test('getEndowmentsForConfig - ensure setTimeout calls dont trigger illegal invocation', (t) => {
  'use strict'
  // compartment.globalThis.document would error because 'this' value is not window
  const { getEndowmentsForConfig } = prepareTest()
  const sourceGlobal = {
    setTimeout() {
      return this
    },
  }
  const config = {
    globals: {
      setTimeout: true,
    },
  }
  const resultGlobal = getEndowmentsForConfig(sourceGlobal, config)
  t.is(resultGlobal.setTimeout(), sourceGlobal)
})

test('copyWrappedGlobals - support other realm prototype chains', (t) => {
  'use strict'
  const { copyWrappedGlobals } = prepareTest()
  const forkedProto = Object.create(null)
  forkedProto.hasOwnProperty = () => true
  forkedProto.legitimateValue = 1
  Object.defineProperty(forkedProto, 'aNonEnumerableValue', {
    value: 2,
    enumerable: false,
  })

  const sourceProto = Object.create(forkedProto)
  sourceProto.onTheProto = function () {}
  const source = Object.create(sourceProto)
  source.onTheObj = function () {}
  const target = Object.create(null)

  // used to throw
  // Error: Lavamoat - unable to find common prototype between Compartment and globalRef
  copyWrappedGlobals(source, target, ['window'])

  t.is(
    Object.getOwnPropertyNames(target).sort().join(),
    'aNonEnumerableValue,legitimateValue,onTheObj,onTheProto,window'
  )
})

test('copyWrappedGlobals - copy from prototype too', (t) => {
  'use strict'
  const { copyWrappedGlobals } = prepareTest()
  const sourceProto = {
    onTheProto: function () {},
  }
  Object.defineProperty(sourceProto, 'aNonEnumerableValue', {
    value: 2,
    enumerable: false,
  })
  const source = Object.create(sourceProto)
  source.onTheObj = function () {}
  const target = Object.create(null)
  copyWrappedGlobals(source, target, ['window'])

  t.is(
    Object.getOwnPropertyNames(target).sort().join(),
    'aNonEnumerableValue,onTheObj,onTheProto,window'
  )
})

test('getBuiltinForConfig - nested builtin access', (t) => {
  const { getBuiltinForConfig } = prepareTest()
  const customSymbol = Symbol('custom')
  const moduleNamespace = {
    inspect: {
      custom: customSymbol,
      defaultOptions: { depth: 5 },
    },
    format: 'text',
  }
  const policyBuiltin = {
    'util.inspect.custom': true,
  }
  const result = getBuiltinForConfig(moduleNamespace, 'util', policyBuiltin)

  t.is(result.inspect.custom, customSymbol)
  t.is(result.inspect.defaultOptions, undefined)
  t.is(result.format, undefined)
})

test('getBuiltinForConfig - explicitlyBanned via false in policy', (t) => {
  const { getBuiltinForConfig } = prepareTest()
  const moduleNamespace = {
    parse: function () {},
    stringify: function () {},
    extensions: {
      safe: 'yes',
      dangerous: 'no',
    },
  }
  const policyBuiltin = {
    'mymod.stringify': true,
    'mymod.extensions': false,
    'mymod.extensions.safe': true,
  }
  const result = getBuiltinForConfig(moduleNamespace, 'mymod', policyBuiltin)

  t.is(result.parse, undefined)
  t.is(typeof result.stringify, 'function')
  t.is(result.extensions.safe, 'yes')
  t.is(result.extensions.dangerous, undefined)
})

test('attenuateBuiltin - explicitlyBanned via false in policy', (t) => {
  const { attenuateBuiltin } = prepareTest()
  const moduleNamespace = {
    parse: function () {},
    stringify: function () {},
    extensions: {
      safe: 'yes',
      dangerous: 'no',
    },
  }
  const paths = ['extensions.safe', 'stringify']
  // NOTE: no need to explicitly ban for this to work
  const result = attenuateBuiltin(moduleNamespace, paths)

  t.is(result.parse, undefined)
  t.is(typeof result.stringify, 'function')
  t.is(result.extensions.safe, 'yes')
  t.is(result.extensions.dangerous, undefined)
})

test('copyWrappedGlobals - static methods on wrapped functions', (t) => {
  'use strict'
  const { copyWrappedGlobals } = prepareTest()

  const source = {
    Array,
    Uint8Array,
  }
  const target = Object.create(null)
  copyWrappedGlobals(source, target)

  t.is(typeof target.Array.from, 'function')
  t.is(typeof target.Uint8Array.from, 'function')
})

/**
 * Creates a test-double for a capability definition. By default, `endow` stamps
 * each option value as a key on the endowments object, so a single call can
 * verify both that options were received and that endowments mutation works.
 *
 * E.g. options=['hello'] → endowments['hello'] = true
 */
function makeCapabilityMock(overrides = {}) {
  const calls = []
  const cap = {
    ambient: false,
    endow({ options, endowments }) {
      calls.push({ options, endowments })
      for (const opt of options) {
        endowments[opt] = true
      }
    },
    calls,
    ...overrides,
  }
  return cap
}

test('capabilities - factory without capabilities preserves existing behavior', (t) => {
  const { getEndowmentsForConfig } = endowmentsToolkit()
  const sourceGlobal = { x: 1 }
  const result = getEndowmentsForConfig(sourceGlobal, { globals: { x: true } })
  t.is(result.x, 1)
})

test('capabilities - getEndowmentsForConfig calls endow for listed capability', (t) => {
  const allArgs = []
  const cap = makeCapabilityMock({
    endow(args) {
      allArgs.push(args)
    },
  })
  const capabilities = new Map([['my-cap', cap]])
  const { getEndowmentsForConfig } = endowmentsToolkit({ capabilities })

  const sourceGlobal = {}
  const compartmentGlobalThis = {}
  getEndowmentsForConfig(
    sourceGlobal,
    { capabilities: { 'my-cap': ['opt1'] } },
    {},
    compartmentGlobalThis
  )

  t.is(allArgs.length, 1)
  const call = allArgs[0]
  t.deepEqual(call.options, ['opt1'])
  t.is(call.compartmentGlobalThis, compartmentGlobalThis)
  t.is(call.rootCompartmentGlobalThis, sourceGlobal)
})

test('capabilities - getEndowmentsForConfig throws for unknown capability', (t) => {
  const { getEndowmentsForConfig } = endowmentsToolkit()
  t.throws(
    () => getEndowmentsForConfig({}, { capabilities: { 'unknown-cap': [] } }),
    { message: /unknown capability "unknown-cap"/ }
  )
})

test('capabilities - endow can mutate endowments and receives options', (t) => {
  const cap = makeCapabilityMock()
  const capabilities = new Map([['stamping-cap', cap]])
  const { getEndowmentsForConfig } = endowmentsToolkit({ capabilities })

  const result = getEndowmentsForConfig(
    {},
    { capabilities: { 'stamping-cap': ['hello', 'world'] } }
  )

  // options were received
  t.deepEqual(cap.calls[0].options, ['hello', 'world'])
  // mutation was visible in the returned endowments
  t.true(result.hello)
  t.true(result.world)
})

test('capabilities - multiple capabilities applied in listing order', (t) => {
  const order = []
  const capA = makeCapabilityMock({
    endow() {
      order.push('A')
    },
  })
  const capB = makeCapabilityMock({
    endow() {
      order.push('B')
    },
  })
  const capabilities = new Map([
    ['cap-a', capA],
    ['cap-b', capB],
  ])
  const { getEndowmentsForConfig } = endowmentsToolkit({ capabilities })

  getEndowmentsForConfig({}, { capabilities: { 'cap-a': [], 'cap-b': [] } })

  t.deepEqual(order, ['A', 'B'])
})

test('capabilities - copyWrappedGlobals applies root capabilities', (t) => {
  const allArgs = []
  const cap = makeCapabilityMock({
    endow(args) {
      allArgs.push(args)
    },
  })
  const capabilities = new Map([['root-cap', cap]])
  const { copyWrappedGlobals } = endowmentsToolkit({ capabilities })

  const source = { x: 1 }
  const target = Object.create(null)
  copyWrappedGlobals(source, target, ['globalThis'], { 'root-cap': ['opt'] })

  t.is(allArgs.length, 1)
  const call = allArgs[0]
  t.is(call.endowments, target)
  t.is(call.compartmentGlobalThis, target)
  t.is(call.rootCompartmentGlobalThis, target)
  t.deepEqual(call.options, ['opt'])
})

test('capabilities - ambient capabilities separated but not invoked', (t) => {
  const ambientCap = makeCapabilityMock({ ambient: true })
  const localCap = makeCapabilityMock({ ambient: false })
  const capabilities = new Map([
    ['ambient-cap', ambientCap],
    ['local-cap', localCap],
  ])
  const { getEndowmentsForConfig } = endowmentsToolkit({ capabilities })

  // Only local-cap is listed in policy; ambient-cap should not be called
  getEndowmentsForConfig({}, { capabilities: { 'local-cap': [] } })

  t.is(localCap.calls.length, 1)
  t.is(ambientCap.calls.length, 0)
})
