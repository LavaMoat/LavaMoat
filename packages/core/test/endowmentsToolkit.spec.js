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
test('getEndowmentsForConfig - writable global setter propagates to original', (t) => {
  'use strict'
  // compartment.globalThis.document would error because 'this' value is not window
  const { getEndowmentsForConfig, copyWrappedGlobals } = prepareTest({
    knownWritable: new Set(['onerror']),
  })
  const originalGlobal = {}
  Object.defineProperty(originalGlobal, 'onerror', {
    set(value) {
      this._onerror = value
    },
    get() {
      return this._onerror
    },
  })

  // verify that the setter works on the original global
  originalGlobal.onerror = 'initialErrorHandler'
  t.is(originalGlobal._onerror, 'initialErrorHandler')

  const sourceGlobal = copyWrappedGlobals(originalGlobal, {})

  // verify that the setter works on the wrapped global
  sourceGlobal.onerror = 'wrappedErrorHandler'
  t.is(originalGlobal._onerror, 'wrappedErrorHandler')

  const config = {
    globals: {
      onerror: 'write',
    },
  }
  const resultGlobal = getEndowmentsForConfig(sourceGlobal, config)

  resultGlobal.onerror = 'myErrorHandler'
  // proof that the setter was called on the original global
  t.is(originalGlobal._onerror, 'myErrorHandler')
  t.is(resultGlobal._onerror, undefined)
})

test('getEndowmentsForConfig - writable global handles monkey-patching', (t) => {
  'use strict'
  const knownWritable = new Set(['fetch'])
  const { getEndowmentsForConfig, copyWrappedGlobals } = prepareTest({
    knownWritable,
  })

  // Simulate a native function
  const browserGlobal = {}
  browserGlobal.fetch = function nativeFetch(url) {
    // yes, fetch is funny like that.
    if (typeof this !== 'undefined' && this !== browserGlobal) {
      throw new TypeError(
        `Illegal invocation: expected this=browserGlobal, got this=${String(this)}`
      )
    }

    return `fetched(${url}) // ${typeof this} ${this === browserGlobal}`
  }

  // Level 1: copyWrappedGlobals produces the root compartment's source global.
  const rootCompartmentGlobal = copyWrappedGlobals(browserGlobal, {})

  // Level 2: getEndowmentsForConfig with write policy produces the package view.
  const packageCompartmentGlobal = getEndowmentsForConfig(
    rootCompartmentGlobal,
    { globals: { fetch: 'write' } },
    rootCompartmentGlobal // unwrapTo
  )

  const anotherPackageCompartmentGlobal = getEndowmentsForConfig(
    rootCompartmentGlobal,
    { globals: { fetch: true } },
    rootCompartmentGlobal // unwrapTo
  )

  const directCallResult = packageCompartmentGlobal.fetch('https://example.com')
  t.is(directCallResult, 'fetched(https://example.com) // object true')

  // Sentry-style instrumentation: capture original, replace with wrapper, call original
  const originalFetch = packageCompartmentGlobal.fetch

  packageCompartmentGlobal.fetch = function sentryLikeFetchWrapper(url) {
    'use strict'
    return 'patched!' + originalFetch(url)
  }

  t.is(
    packageCompartmentGlobal.fetch('https://example.com'),
    'patched!fetched(https://example.com) // undefined false'
  )
  t.is(
    anotherPackageCompartmentGlobal.fetch('https://example.com'),
    'patched!fetched(https://example.com) // undefined false'
  )

  // bound case
  packageCompartmentGlobal.fetch = function sentryLikeFetchWrapper(url) {
    'use strict'
    return originalFetch.call(packageCompartmentGlobal, url)
  }

  t.is(
    packageCompartmentGlobal.fetch('https://example.com'),
    'patched!fetched(https://example.com) // object true'
  )
  t.is(
    anotherPackageCompartmentGlobal.fetch('https://example.com'),
    'patched!fetched(https://example.com) // object true'
  )
})

test('getEndowmentsForConfig - writable global is not leaky (in case AI insists on making it so again)', (t) => {
  'use strict'
  const knownWritable = new Set(['fetch'])
  const { getEndowmentsForConfig, copyWrappedGlobals } = prepareTest({
    knownWritable,
  })

  // Simulate a native function
  const browserGlobal = {}
  browserGlobal.fetch = function nativeFetch() {
    //whatever
  }

  const rootCompartmentGlobal = copyWrappedGlobals(browserGlobal, {})

  const packageCompartmentGlobal = getEndowmentsForConfig(
    rootCompartmentGlobal,
    { globals: { fetch: 'write' } },
    rootCompartmentGlobal
  )

  const anotherPackageCompartmentGlobal = getEndowmentsForConfig(
    rootCompartmentGlobal,
    { globals: { fetch: true } },
    rootCompartmentGlobal // unwrapTo
  )

  packageCompartmentGlobal.fetch = function abuseRewrapping() {
    return [this]
  }

  const stolen = packageCompartmentGlobal.fetch()
  t.not(stolen[0], browserGlobal)
  t.not(stolen[0], rootCompartmentGlobal)
  t.is(stolen[0], packageCompartmentGlobal)

  const anotherStolen = anotherPackageCompartmentGlobal.fetch()
  t.not(anotherStolen[0], browserGlobal)
  t.not(anotherStolen[0], rootCompartmentGlobal)
  t.is(anotherStolen[0], anotherPackageCompartmentGlobal)
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
