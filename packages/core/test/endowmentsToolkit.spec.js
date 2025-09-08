const test = require('ava')
const endowmentsToolkit = require('../src/endowmentsToolkit.js')

/**
 * @param {Object} [options]
 * @param {Set<string>}
 * @returns {ReturnType<typeof endowmentsToolkit>}
 */
function prepareTest({ knownWritable } = {}) {
  const { getEndowmentsForConfig, copyWrappedGlobals, createDonor } =
    endowmentsToolkit({
      handleGlobalWrite: !!knownWritable,
      knownWritableFields: knownWritable,
    })
  return { getEndowmentsForConfig, copyWrappedGlobals, createDonor }
}

// Note: All tests are in strict mode because the endowments will be used in that mode only.
// Some of the tests would fail in sloppy mode and that's expected.

test('getEndowmentsForConfig', (t) => {
  'use strict'
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
  'use strict'
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
  'use strict'
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

test('getEndowmentsForConfig - knownWritable', (t) => {
  'use strict'
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
  'use strict'
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

test('donor - writable fields get updated in compartments and in root but not globally', (t) => {
  'use strict'
  const knownWritable = new Set(['a'])
  const { createDonor } = prepareTest({
    knownWritable,
  })

  const originalSource = { a: 1, b: 2 }

  const config = {
    globals: {
      a: 'write',
    },
  }
  // A way to separate the root compartment endowment from the store for globals
  // in lavamoat. Note that endowAll uses the same optional references for unwrapping

  // Storage for globals we cache in lavamoat
  const donor = createDonor(originalSource)
  // root compartment global
  const rootGlobal = donor.endowAll()
  // non-root compartments
  const endowments = donor.endowSpecified(config)
  const endowments2 = donor.endowSpecified(config)

  endowments.a = 42

  t.is(rootGlobal.a, 42)
  t.is(endowments2.a, 42)
  t.is(originalSource.a, 1)
})

test('donor - non-writable fields create independent copies', (t) => {
  'use strict'
  // we need strict mode to get errors when attempting to set on a getter-only property
  const knownWritable = new Set(['a'])
  const { createDonor } = prepareTest({
    knownWritable,
  })

  const originalSource = { a: 1, b: 2 }

  const config = {
    globals: {
      // Note that despite regular endowment `a` is a getter because it was listed in knownWritable
      a: true,
    },
  }

  // Storage for globals we cache in lavamoat
  const donor = createDonor(originalSource)
  // root compartment global
  const rootGlobal = donor.endowAll()
  // non-root compartments
  const endowments = donor.endowSpecified(config)
  const endowments2 = donor.endowSpecified(config)

  t.throws(
    () => {
      endowments.a = 42
    },
    { message: 'Cannot set property a of #<Object> which has only a getter' }
  )

  t.is(rootGlobal.a, 1)
  t.is(endowments.a, 1)
  t.is(endowments2.a, 1)
  t.is(originalSource.a, 1)

  rootGlobal.a = 44

  t.is(rootGlobal.a, 44)
  t.is(endowments.a, 44)
  t.is(endowments2.a, 44)
  t.is(originalSource.a, 1)
})

test('copyWrappedGlobals - nested writable fields get updated in compartments and in root but not globally', (t) => {
  'use strict'
  const knownWritable = new Set(['a'])
  const { createDonor } = prepareTest({
    knownWritable,
  })
  const originalSource = { a: { b: { c: 1 }, no: 1 }, d: 2 }

  const config1 = {
    globals: {
      'a.b.c': true,
    },
  }
  const config2 = {
    globals: {
      a: 'write',
    },
  }

  // Storage for globals we cache in lavamoat
  const donor = createDonor(originalSource)
  // root compartment global
  const rootGlobal = donor.endowAll()
  // non-root compartments
  const endowments = donor.endowSpecified(config1)
  const endowments2 = donor.endowSpecified(config2)
  endowments2.a = { b: { c: 42, no: 2 } }

  t.is(rootGlobal.a.b.c, 42)
  t.is(rootGlobal.a.b.no, 2)
  t.is(endowments.a.b.c, 42)
  t.is(endowments.a.b.no, undefined)
  t.is(endowments2.a.b.c, 42)
  t.is(endowments2.a.b.no, 2)
  t.is(originalSource.a.b.c, 1)
})

test('getEndowmentsForConfig - knownWritable and tightening access with false', (t) => {
  'use strict'
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
  'use strict'
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
  'use strict'
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
  'use strict'
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
  'use strict'
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
  // we need strict mode for the getter behavior in the last assertion

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
  const resultGlobal = getEndowmentsForConfig(
    sourceGlobal,
    config,
    sourceGlobal
  )

  const getter = Reflect.getOwnPropertyDescriptor(resultGlobal, 'xyz').get

  t.is(resultGlobal.xyz, sourceGlobal)
  t.is(getter.call(resultGlobal), sourceGlobal)
  t.is(getter.call(sourceGlobal), sourceGlobal)
  // would not work in sloppy mode
  t.is(getter.call(), globalThis)
})
test('getEndowmentsForConfig - ensure correct default unwrapping', (t) => {
  'use strict'
  // we need strict mode for the getter behavior in the last assertion

  // compartment.globalThis.document would error because 'this' value is not window
  const { getEndowmentsForConfig } = prepareTest()
  Object.defineProperty(globalThis, 'xyz', {
    get() {
      if (this !== globalThis) {
        throw Error('emulated illegal invocation')
      }
      return this
    },
    configurable: true,
  })
  const config = {
    globals: {
      xyz: true,
    },
  }
  const resultGlobal = getEndowmentsForConfig(globalThis, config)

  const getter = Reflect.getOwnPropertyDescriptor(resultGlobal, 'xyz').get

  t.is(resultGlobal.xyz, globalThis)
  t.is(getter.call(resultGlobal), globalThis)
  t.is(getter.call(globalThis), globalThis)
  // would not work in sloppy mode
  t.is(getter.call(), globalThis)

  delete globalThis.xyz
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
  // would not work in sloppy mode
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
  // would not work in sloppy mode
  t.is(getter.call(), globalThis)
})

test('endowAll - specify unwrap from, unwrap to', (t) => {
  'use strict'
  // compartment.globalThis.document would error because 'this' value is not window
  const unwrapTo = {}
  const unwrapFrom = {}
  const { createDonor } = prepareTest()
  const sourceGlobal = {
    get xyz() {
      return this
    },
  }
  const donor = createDonor(sourceGlobal)
  const resultGlobal = donor.endowAll(unwrapTo, unwrapFrom)
  const getter = Reflect.getOwnPropertyDescriptor(resultGlobal, 'xyz').get

  t.is(resultGlobal.xyz, resultGlobal)
  t.is(getter.call(resultGlobal), resultGlobal)
  t.is(getter.call(sourceGlobal), sourceGlobal)
  t.is(getter.call(unwrapTo), unwrapTo)
  t.is(getter.call(unwrapFrom), unwrapTo)
  // would not work in sloppy mode
  t.is(getter.call(), globalThis)
})

// eslint-disable-next-line ava/no-async-fn-without-await
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

test('unwrapping - ensure setTimeout calls dont trigger illegal invocation', (t) => {
  'use strict'
  // compartment.globalThis.document would error because 'this' value is not window
  const { getEndowmentsForConfig, copyWrappedGlobals, createDonor } =
    prepareTest()
  const sourceGlobal = {
    setTimeout() {
      if (this !== sourceGlobal) {
        throw Error('emulated illegal invocation')
      }
      return this
    },
  }
  Object.defineProperty(sourceGlobal, 'circularGetter', {
    get: function () {
      if (this !== sourceGlobal) {
        throw Error('emulated illegal invocation')
      }
      return this
    },
    enumerable: true,
  })
  const config = {
    globals: {
      setTimeout: true,
      circularGetter: true,
    },
  }
  const resultGlobal = getEndowmentsForConfig(sourceGlobal, config)
  t.is(resultGlobal.setTimeout(), sourceGlobal)
  t.is(resultGlobal.circularGetter, sourceGlobal)

  const resultGlobal2 = {}
  copyWrappedGlobals(sourceGlobal, resultGlobal2)
  t.is(resultGlobal2.setTimeout(), sourceGlobal)
  t.is(resultGlobal2.circularGetter, sourceGlobal)

  const resultGlobal3 = {}
  const resultGlobal4 = {}
  const donor = createDonor(sourceGlobal)
  const endowments3 = donor.endowAll(sourceGlobal, resultGlobal3)
  Object.defineProperties(
    resultGlobal3,
    Object.getOwnPropertyDescriptors(endowments3)
  )
  const endowments4 = donor.endowSpecified(config, sourceGlobal, resultGlobal4)
  Object.defineProperties(
    resultGlobal4,
    Object.getOwnPropertyDescriptors(endowments4)
  )

  // Should we censor function output?
  t.is(resultGlobal3.setTimeout(), sourceGlobal)
  t.is(resultGlobal3.circularGetter, sourceGlobal)
  t.is(resultGlobal4.setTimeout(), sourceGlobal)
  t.is(resultGlobal4.circularGetter, sourceGlobal)
})

test('unwrapping - ensure setTimeout calls dont trigger illegal invocation - with write', (t) => {
  'use strict'
  // compartment.globalThis.document would error because 'this' value is not window
  const { getEndowmentsForConfig, copyWrappedGlobals, createDonor } =
    prepareTest({
      knownWritable: new Set(['setTimeout', 'circularGetter']),
    })
  const sourceGlobal = {
    setTimeout() {
      if (this !== sourceGlobal) {
        throw Error('emulated illegal invocation')
      }
      return this
    },
  }
  Object.defineProperty(sourceGlobal, 'circularGetter', {
    get: function () {
      if (this !== sourceGlobal) {
        throw Error('emulated illegal invocation')
      }
      return this
    },
    enumerable: true,
  })
  const config = {
    globals: {
      setTimeout: true,
      circularGetter: true,
    },
  }
  const resultGlobal = getEndowmentsForConfig(sourceGlobal, config)
  t.is(resultGlobal.setTimeout(), sourceGlobal)
  t.is(resultGlobal.circularGetter, sourceGlobal)

  const resultGlobal2 = {}
  copyWrappedGlobals(sourceGlobal, resultGlobal2)
  t.is(resultGlobal2.setTimeout(), sourceGlobal)
  t.is(resultGlobal2.circularGetter, sourceGlobal)

  const resultGlobal3 = {}
  const resultGlobal4 = {}
  const donor = createDonor(sourceGlobal)
  const endowments3 = donor.endowAll(sourceGlobal, resultGlobal3)
  Object.defineProperties(
    resultGlobal3,
    Object.getOwnPropertyDescriptors(endowments3)
  )
  const endowments4 = donor.endowSpecified(config, sourceGlobal, resultGlobal4)
  Object.defineProperties(
    resultGlobal4,
    Object.getOwnPropertyDescriptors(endowments4)
  )

  // Should we censor function output?
  t.is(resultGlobal3.setTimeout(), sourceGlobal)
  t.is(resultGlobal3.circularGetter, sourceGlobal)
  t.is(resultGlobal4.setTimeout(), sourceGlobal)
  t.is(resultGlobal4.circularGetter, sourceGlobal)
})

test('copyWrappedGlobals - copy from prototype too', (t) => {
  'use strict'
  const { copyWrappedGlobals } = prepareTest()
  const sourceProto = {
    onTheProto: function () {},
  }
  const source = Object.create(sourceProto)
  source.onTheObj = function () {}
  const target = Object.create(null)
  copyWrappedGlobals(source, target, ['window'])

  t.is(Object.keys(target).sort().join(), 'onTheObj,onTheProto,window')
})

test('endowAll - includes fields from source prototype, skips circular fields', (t) => {
  'use strict'
  const { createDonor } = prepareTest()
  const sourceProto = {
    onTheProto: function () {},
  }
  const source = Object.create(sourceProto)
  source.onTheObj = function () {}
  source.window = source

  const donor = createDonor(source)

  const endowments = donor.endowAll()

  t.is(Object.keys(endowments).sort().join(), 'onTheObj,onTheProto')
})

// minimal repro of window.event with write in react-dom
test('writable and unwrap not clashing', (t) => {
  'use strict'
  const { createDonor } = prepareTest({
    knownWritable: new Set(['event']),
  })
  const source = { a: 1 }
  Object.defineProperty(source, 'event', {
    get() {
      return 1
    },
    set(value) {
      'use strict'
      console.log(1, this, this === source)
      Object.defineProperty(this, 'event', { value })
    },
    configurable: true,
  })

  const donor = createDonor(source)

  const compartmentGlobal = Object.create(null)
  const endowments = donor.endowSpecified(
    {
      globals: { event: 'write' },
    },
    source,
    compartmentGlobal
  )

  Object.defineProperties(compartmentGlobal, endowments)

  Object.defineProperty(source, 'event', { value: {}, configurable: false })

  t.throws(() => {
    endowments.event = {}
  })
})
