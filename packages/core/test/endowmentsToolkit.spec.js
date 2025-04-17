const test = require('ava')
const endowmentsToolkit = require('../src/endowmentsToolkit.js')

function prepareTest({ knownWritable } = {}) {
  const { getEndowmentsForConfig, copyWrappedGlobals } = endowmentsToolkit({
    handleGlobalWrite: !!knownWritable,
    knownWritableFields: knownWritable,
  })
  return { getEndowmentsForConfig, copyWrappedGlobals }
}

test('getEndowmentsForConfig', (t) => {
  const { getEndowmentsForConfig } = prepareTest()
  const sourceGlobal = {
    namespace: {
      stringValue: 'yabbadabbadoo',
    },
  }
  const policy = {
    globals: {
      'namespace.stringValue.includes': true,
    },
  }
  const resultGlobal = getEndowmentsForConfig(sourceGlobal, policy)
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
  const policy = {
    globals: {
      'lookAtMyProto.appendChild': true,
    },
  }
  const resultGlobal = getEndowmentsForConfig(sourceGlobal, policy)
  t.is(resultGlobal.lookAtMyProto.appendChild(), assertMe)
})

test('getEndowmentsForConfig - siblings', (t) => {
  const { getEndowmentsForConfig } = prepareTest()
  const sourceGlobal = { Buffer }
  const policy = {
    globals: {
      'Buffer.from': true,
      'Buffer.isBuffer': true,
    },
  }
  const resultGlobal = getEndowmentsForConfig(sourceGlobal, policy)
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
  const knownWritable = new Set(['a', 'b', 'x'])
  const { getEndowmentsForConfig } = prepareTest({ knownWritable })
  const sourceGlobal = {
    a: 1,
    b: { c: 2 },
    d: 3,
  }
  const policy = {
    globals: {
      a: true,
      'b.c': true,
      d: true,
    },
  }
  const resultGlobal = getEndowmentsForConfig(sourceGlobal, policy)
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

  const policy = {
    globals: {
      'a.b.c': true,
      'a.b': false,
      'a.q': true,
    },
  }

  const resultGlobal = getEndowmentsForConfig(sourceGlobal, policy)
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

  const policy = {
    globals: {
      'a.b': true,
      'a.b.c': true,
      'a.q': true,
    },
  }

  t.throws(() => getEndowmentsForConfig(sourceGlobal, policy))
})

test('getEndowmentsForConfig - read-write', (t) => {
  const knownWritable = new Set(['a', 'b'])
  const { getEndowmentsForConfig } = prepareTest({ knownWritable })
  const sourceGlobal = {
    a: 1,
    b: { c: 2 },
    d: 3,
  }
  const policy1 = {
    globals: {
      a: true,
      'b.c': true,
      d: true,
    },
  }
  const policy2 = {
    globals: {
      a: 'write',
      b: 'write',
    },
  }
  const global1 = getEndowmentsForConfig(sourceGlobal, policy1)
  const global2 = getEndowmentsForConfig(sourceGlobal, policy2)
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
  const policy = {
    globals: {
      'abc.xyz': true,
    },
  }
  const resultGlobal = getEndowmentsForConfig(sourceGlobal, policy)
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

  const policy = {
    globals: {
      'zzz.zzz.zzz': true,
    },
  }
  const policyShallow = {
    globals: {
      'zzz.zzz': true,
    },
  }
  const resultGlobal = getEndowmentsForConfig(sourceGlobal, policy)
  const resultGlobalShallow = getEndowmentsForConfig(
    sourceGlobal,
    policyShallow
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
  const policy = {
    globals: {
      xyz: true,
    },
  }
  const resultGlobal = getEndowmentsForConfig(sourceGlobal, policy)

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
  const policy = {
    globals: {
      xyz: true,
    },
  }
  const resultGlobal = getEndowmentsForConfig(sourceGlobal, policy, unwrapTo)
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
  const policy = {
    globals: {
      xyz: true,
    },
  }
  const resultGlobal = getEndowmentsForConfig(
    sourceGlobal,
    policy,
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

// eslint-disable-next-line ava/no-async-fn-without-await
test('getEndowmentsForConfig - endowing bind of a function', async (t) => {
  'use strict'
  const { getEndowmentsForConfig } = prepareTest()
  const sourceGlobal = {
    abc: function () {
      return this
    },
  }
  const policy = {
    globals: {
      'abc.bind': true,
    },
  }
  const resultGlobal = getEndowmentsForConfig(sourceGlobal, policy)

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
  const policy = {
    globals: {
      setTimeout: true,
    },
  }
  const resultGlobal = getEndowmentsForConfig(sourceGlobal, policy)
  t.is(resultGlobal.setTimeout(), sourceGlobal)
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

test('getEndowmentsForConfig - allow redefine on properties', (t) => {
  'use strict'
  const knownWritable = new Set(['x', 'y'])
  const { getEndowmentsForConfig } = prepareTest({ knownWritable })
  const sourceGlobal = {
    ...globalThis,
    x: 1,
    y: 2,
    z: 3,
  }
  const policy = {
    globals: {
      x: 'write+define',
      y: 'write',
      z: true,
    },
  }
  // Compartment's globalThis
  const derivedGlobal = {
    Object,
    Array,
    Error,
    Promise, // and so on...
  }
  const endowments = getEndowmentsForConfig(
    sourceGlobal,
    policy,
    globalThis,
    derivedGlobal
  )
  Object.defineProperties(
    derivedGlobal,
    Object.getOwnPropertyDescriptors(endowments)
  )
  t.is(typeof derivedGlobal.Object, 'object')
  Object.freeze(derivedGlobal)

  // Regular property access works
  t.is(derivedGlobal.x, 1)
  t.is(derivedGlobal.y, 2)
  t.is(derivedGlobal.z, 3)

  // Regular write works for both 'write' and 'redefine'
  derivedGlobal.x = 10
  derivedGlobal.y = 20
  t.is(derivedGlobal.x, 10)
  t.is(derivedGlobal.y, 20)
  t.is(sourceGlobal.x, 10, 'source value updated for redefine property')
  t.is(sourceGlobal.y, 20, 'source value updated for write property')

  // defineProperty works for 'write+define' but not for others
  derivedGlobal.Object.defineProperty(derivedGlobal, 'x', {
    value: 100,
    // writable, configurable, and enumerable are not applied
  })

  t.is(derivedGlobal.x, 100, 'value updated after defineProperty')
  t.is(sourceGlobal.x, 100, 'source value updated after defineProperty')

  // Trying to defineProperty on a 'write' property should throw
  t.throws(
    () => {
      derivedGlobal.Object.defineProperty(derivedGlobal, 'y', {
        value: 200,
      })
    },
    { message: /Cannot redefine property/ }
  )

  // Trying to defineProperty on a read-only property should throw
  t.throws(
    () => {
      derivedGlobal.Object.defineProperty(derivedGlobal, 'z', {
        value: 300,
      })
    },
    { message: /Cannot redefine property/ }
  )
})
