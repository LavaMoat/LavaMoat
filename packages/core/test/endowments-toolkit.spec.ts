/**
 * Tests for `@lavamoat/core/endowments-toolkit`
 *
 * Ported from `lavamoat-core/test/endowmentsToolkit.spec.js`.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import test from 'ava'
import { endowmentsToolkit, _test } from '../src/endowments-toolkit.ts'

// ---------------------------------------------------------------------------
// no-runtime-imports guard
// ---------------------------------------------------------------------------

test('endowments-toolkit compiled output has no runtime imports', (t) => {
  const distPath = resolve(
    fileURLToPath(import.meta.url),
    '../../dist/endowments-toolkit.js'
  )
  const src = readFileSync(distPath, 'utf8')
  // Strip line comments and block comments before checking
  const stripped = src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
  const importLines = stripped
    .split('\n')
    .filter((l) => /^\s*import\b/.test(l) || /^\s*require\s*\(/.test(l))
  t.is(
    importLines.length,
    0,
    `Expected no runtime imports but found:\n${importLines.join('\n')}`
  )
})

// ---------------------------------------------------------------------------
// test helpers
// ---------------------------------------------------------------------------

function prepareTest({ knownWritable }: { knownWritable?: Set<string> } = {}) {
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

// ---------------------------------------------------------------------------
// getEndowmentsForConfig
// ---------------------------------------------------------------------------

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
  t.true(sourceGlobal.namespace.stringValue.includes('dab'))
  t.true(
    (
      resultGlobal.namespace as typeof sourceGlobal.namespace
    ).stringValue.includes('dab')
  )
})

test('getEndowmentsForConfig - function on proto', (t) => {
  const { getEndowmentsForConfig } = prepareTest()
  const assertMe = Symbol('assertMe')
  const appendChild = (): typeof assertMe => assertMe
  const theProto = { appendChild }
  const sourceGlobal = {
    lookAtMyProto: Object.create(theProto) as { appendChild: () => symbol },
  }
  const config = {
    globals: {
      'lookAtMyProto.appendChild': true,
    },
  }
  const resultGlobal = getEndowmentsForConfig(sourceGlobal, config)
  t.is(
    (
      resultGlobal.lookAtMyProto as typeof sourceGlobal.lookAtMyProto
    ).appendChild(),
    assertMe
  )
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
    )!
    const resultProp = Object.getOwnPropertyDescriptor(
      (resultGlobal as typeof sourceGlobal).Buffer,
      'from'
    )!
    t.is(typeof resultProp.value, 'function')
    t.deepEqual(
      resultProp,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      { ...sourceProp, value: resultProp.value },
      'prop descriptor matches (except value)'
    )
  }
  {
    const sourceProp = Object.getOwnPropertyDescriptor(
      sourceGlobal.Buffer,
      'isBuffer'
    )!
    const resultProp = Object.getOwnPropertyDescriptor(
      (resultGlobal as typeof sourceGlobal).Buffer,
      'isBuffer'
    )!
    t.is(typeof resultProp.value, 'function')
    t.deepEqual(
      resultProp,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      { ...sourceProp, value: resultProp.value },
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
      a: false as const,
      'a.q': true as const,
    },
  }
  const resultGlobal = getEndowmentsForConfig(sourceGlobal, config)
  t.is(typeof resultGlobal.a, 'object')
  t.is(resultGlobal.a?.b, undefined)
  t.is(resultGlobal.a?.q, 1)
})

test('getEndowmentsForConfig - knownWritable', (t) => {
  const knownWritable = new Set(['a', 'b', 'x'])
  const { getEndowmentsForConfig } = prepareTest({ knownWritable })
  const sourceGlobal: Record<string, unknown> = {
    a: 1,
    b: { c: 2 },
    d: 3,
  }
  const config = {
    globals: {
      a: true as const,
      'b.c': true as const,
      d: true as const,
    },
  }
  const resultGlobal = getEndowmentsForConfig(
    sourceGlobal,
    config
  ) as typeof sourceGlobal
  t.is(resultGlobal.a, 1)
  t.is((resultGlobal.b as Record<string, unknown>).c, 2)
  t.is(resultGlobal.d, 3)
  t.is(resultGlobal.x, undefined)
  sourceGlobal.a = 11
  sourceGlobal.b = { c: 22 }
  sourceGlobal.d = 33
  t.is(resultGlobal.a, 11)
  t.is((resultGlobal.b as Record<string, unknown>).c, 22)
  // d is NOT in knownWritable, so it should not update
  t.is(resultGlobal.d, 3)
})

test('instrumentDynamicValueAtPath puts a getter at path', (t) => {
  const { instrumentDynamicValueAtPath } = _test

  const source: Record<string, unknown> = {
    a: { b: { c: 1 } },
  }
  const target: Record<PropertyKey, unknown> = {}

  instrumentDynamicValueAtPath(['a', 'b', 'c'], source, target)

  t.is(
    typeof Object.getOwnPropertyDescriptor(
      (target.a as Record<string, unknown>)?.b as object,
      'c'
    )?.get,
    'function'
  )
  t.is(
    (target as Record<string, Record<string, Record<string, unknown>>>).a.b.c,
    1
  )
  ;(source.a as Record<string, Record<string, unknown>>).b.c = 2
  t.is(
    (target as Record<string, Record<string, Record<string, unknown>>>).a.b.c,
    2
  )
})

test('getEndowmentsForConfig - knownWritable and tightening access with false', (t) => {
  const knownWritable = new Set(['a'])
  const { getEndowmentsForConfig } = prepareTest({ knownWritable })
  const sourceGlobal: Record<string, unknown> = {
    a: { b: { c: 2, d: 3 }, q: 1 },
  }
  const config = {
    globals: {
      'a.b.c': true as const,
      'a.b': false as const,
      'a.q': true as const,
    },
  }
  const resultGlobal = getEndowmentsForConfig(
    sourceGlobal,
    config
  ) as typeof sourceGlobal
  t.is(typeof (resultGlobal.a as Record<string, unknown>).b, 'object')
  t.is(
    ((resultGlobal.a as Record<string, unknown>).b as Record<string, unknown>)
      .c,
    2
  )
  t.is(
    ((resultGlobal.a as Record<string, unknown>).b as Record<string, unknown>)
      .d,
    undefined
  )
  t.is((resultGlobal.a as Record<string, unknown>).q, 1)
  ;(sourceGlobal.a as Record<string, unknown>).b = { c: 22 }
  t.is(
    ((resultGlobal.a as Record<string, unknown>).b as Record<string, unknown>)
      .c,
    22
  )
})

test('getEndowmentsForConfig - knownWritable and invalid nesting', (t) => {
  const knownWritable = new Set(['a'])
  const { getEndowmentsForConfig } = prepareTest({ knownWritable })
  const sourceGlobal: Record<string, unknown> = {
    a: { b: { c: 2, d: 3 }, q: 1 },
  }
  const config = {
    globals: {
      'a.b': true as const,
      'a.b.c': true as const,
      'a.q': true as const,
    },
  }
  t.throws(() => getEndowmentsForConfig(sourceGlobal, config))
})

test('getEndowmentsForConfig - read-write', (t) => {
  const knownWritable = new Set(['a', 'b'])
  const { getEndowmentsForConfig } = prepareTest({ knownWritable })
  const sourceGlobal: Record<string, unknown> = {
    a: 1,
    b: { c: 2 },
    d: 3,
  }
  const config1 = {
    globals: {
      a: true as const,
      'b.c': true as const,
      d: true as const,
    },
  }
  const config2 = {
    globals: {
      a: 'write' as const,
      b: 'write' as const,
    },
  }
  const global1 = getEndowmentsForConfig(
    sourceGlobal,
    config1
  ) as typeof sourceGlobal
  const global2 = getEndowmentsForConfig(
    sourceGlobal,
    config2
  ) as typeof sourceGlobal
  t.is(global1.a, 1)
  t.is((global1.b as Record<string, unknown>).c, 2)
  t.is(global1.d, 3)
  t.is(global1.x, undefined)
  global2.a = 11
  global2.b = { c: 22 }
  global2.d = 33
  t.is(global1.a, 11)
  t.is((global1.b as Record<string, unknown>).c, 22)
  t.is(global1.d, 3)
})

test('getEndowmentsForConfig - basic getter', (t) => {
  const { getEndowmentsForConfig } = prepareTest()
  const sourceGlobal = {
    get abc() {
      return { xyz: 42 }
    },
  }
  const config = { globals: { 'abc.xyz': true as const } }
  const resultGlobal = getEndowmentsForConfig(
    sourceGlobal,
    config
  ) as typeof sourceGlobal
  {
    const sourceProp = Object.getOwnPropertyDescriptor(sourceGlobal, 'abc')!
    const resultProp = Object.getOwnPropertyDescriptor(resultGlobal, 'abc')!
    t.deepEqual(resultProp.value, { xyz: 42 })
    const { enumerable, configurable } = sourceProp
    t.deepEqual(
      resultProp,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      { enumerable, configurable, value: resultProp.value, writable: true },
      'prop descriptor matches (except value)'
    )
  }
})

test('getEndowmentsForConfig - traversing with getters', (t) => {
  const { getEndowmentsForConfig } = prepareTest()
  let dynamicValue = 42
  const recur =
    (n: number): (() => unknown) =>
    () => {
      if (n === 0) return dynamicValue
      const obj: Record<string, unknown> = {}
      Object.defineProperty(obj, 'zzz', {
        get: recur(n - 1),
        enumerable: true,
      })
      return obj
    }
  const sourceGlobal = recur(3)() as Record<string, unknown>
  const config = { globals: { 'zzz.zzz.zzz': true as const } }
  const configShallow = { globals: { 'zzz.zzz': true as const } }

  const resultGlobal = getEndowmentsForConfig(
    sourceGlobal,
    config
  ) as typeof sourceGlobal
  const resultGlobalShallow = getEndowmentsForConfig(
    sourceGlobal,
    configShallow
  ) as typeof sourceGlobal

  const getDescriptorKind = (
    obj: Record<string, unknown> | undefined | null,
    prop: string
  ): 'getter' | 'undefined' | 'value' | 'unknown' => {
    if (!obj) return 'undefined'
    const descriptor = Object.getOwnPropertyDescriptor(obj, prop)
    if (descriptor === undefined) return 'undefined'
    if (descriptor.get !== undefined) return 'getter'
    if (descriptor.value !== undefined) return 'value'
    return 'unknown'
  }

  const descriptors = [
    getDescriptorKind(resultGlobal, 'zzz'),
    getDescriptorKind(resultGlobal.zzz as Record<string, unknown>, 'zzz'),
    getDescriptorKind(
      (resultGlobal.zzz as Record<string, unknown>)?.zzz as Record<
        string,
        unknown
      >,
      'zzz'
    ),
  ]
  const descriptorsShallow = [
    getDescriptorKind(resultGlobalShallow, 'zzz'),
    getDescriptorKind(
      resultGlobalShallow.zzz as Record<string, unknown>,
      'zzz'
    ),
    getDescriptorKind(
      (resultGlobalShallow.zzz as Record<string, unknown>)?.zzz as Record<
        string,
        unknown
      >,
      'zzz'
    ),
  ]
  t.deepEqual(descriptors, ['value', 'value', 'getter'])
  t.deepEqual(descriptorsShallow, ['value', 'getter', 'getter'])
  t.is(
    (
      (resultGlobal.zzz as Record<string, unknown>).zzz as Record<
        string,
        unknown
      >
    ).zzz,
    42
  )
  t.is(
    (
      (resultGlobalShallow.zzz as Record<string, unknown>).zzz as Record<
        string,
        unknown
      >
    ).zzz,
    42
  )
  dynamicValue = 3
  t.is(
    (
      (resultGlobal.zzz as Record<string, unknown>).zzz as Record<
        string,
        unknown
      >
    ).zzz,
    3
  )
  t.is(
    (
      (resultGlobalShallow.zzz as Record<string, unknown>).zzz as Record<
        string,
        unknown
      >
    ).zzz,
    3
  )
})

test('getEndowmentsForConfig - ensure window.document getter behavior support', (t) => {
  'use strict'
  const { getEndowmentsForConfig } = prepareTest()
  const sourceGlobal = {
    get xyz() {
      return this
    },
  }
  const config = { globals: { xyz: true as const } }
  const resultGlobal = getEndowmentsForConfig(sourceGlobal, config)
  const getter = Reflect.getOwnPropertyDescriptor(resultGlobal, 'xyz')!.get as (
    this: unknown
  ) => unknown

  t.is(resultGlobal.xyz, sourceGlobal)
  t.is(getter.call(resultGlobal), sourceGlobal)
  t.is(getter.call(sourceGlobal), sourceGlobal)
  // In strict-mode ESM, calling with undefined keeps `this` as undefined
  // (original CJS test expected globalThis due to sloppy-mode coercion)
  t.is(getter.call(undefined), undefined)
})

test('getEndowmentsForConfig - writable global setter propagates to original', (t) => {
  'use strict'
  const { getEndowmentsForConfig, copyWrappedGlobals } = prepareTest({
    knownWritable: new Set(['onerror']),
  })
  const originalGlobal: Record<string, unknown> = {}
  Object.defineProperty(originalGlobal, 'onerror', {
    set(value: unknown) {
      ;(this as Record<string, unknown>)._onerror = value
    },
    get() {
      return (this as Record<string, unknown>)._onerror
    },
  })

  originalGlobal.onerror = 'initialErrorHandler'
  t.is(originalGlobal._onerror, 'initialErrorHandler')

  const sourceGlobal = copyWrappedGlobals(
    originalGlobal,
    {}
  ) as typeof originalGlobal
  sourceGlobal.onerror = 'wrappedErrorHandler'
  t.is(originalGlobal._onerror, 'wrappedErrorHandler')

  const config = { globals: { onerror: 'write' as const } }
  const resultGlobal = getEndowmentsForConfig(
    sourceGlobal,
    config
  ) as typeof originalGlobal

  resultGlobal.onerror = 'myErrorHandler'
  t.is(originalGlobal._onerror, 'myErrorHandler')
  t.is(resultGlobal._onerror, undefined)
})

test('getEndowmentsForConfig - writable global handles monkey-patching', (t) => {
  'use strict'
  const knownWritable = new Set(['fetch'])
  const { getEndowmentsForConfig, copyWrappedGlobals } = prepareTest({
    knownWritable,
  })

  const browserGlobal: Record<string, unknown> = {}
  browserGlobal.fetch = function nativeFetch(url: unknown) {
    const self = this as unknown
    if (typeof self !== 'undefined' && self !== browserGlobal) {
      throw new TypeError(
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        `Illegal invocation: expected this=browserGlobal, got this=${String(self)}`
      )
    }
    return `fetched(${String(url)}) // ${typeof self} ${String(self === browserGlobal)}`
  }

  const rootCompartmentGlobal = copyWrappedGlobals(
    browserGlobal,
    {}
  ) as typeof browserGlobal
  const packageCompartmentGlobal = getEndowmentsForConfig(
    rootCompartmentGlobal,
    { globals: { fetch: 'write' as const } },
    rootCompartmentGlobal
  ) as typeof browserGlobal

  const anotherPackageCompartmentGlobal = getEndowmentsForConfig(
    rootCompartmentGlobal,
    { globals: { fetch: true as const } },
    rootCompartmentGlobal
  ) as typeof browserGlobal

  const directCallResult = (
    packageCompartmentGlobal.fetch as (url: string) => string
  )('https://example.com')
  t.is(directCallResult, 'fetched(https://example.com) // object true')

  const originalFetch = packageCompartmentGlobal.fetch as (
    url: string
  ) => string
  packageCompartmentGlobal.fetch = function sentryLikeFetchWrapper(
    url: unknown
  ) {
    return 'patched1!' + originalFetch(url as string)
  }

  t.is(
    (packageCompartmentGlobal.fetch as (url: string) => string)(
      'https://example.com'
    ),
    'patched1!fetched(https://example.com) // undefined false'
  )
  t.is(
    (anotherPackageCompartmentGlobal.fetch as (url: string) => string)(
      'https://example.com'
    ),
    'patched1!fetched(https://example.com) // undefined false'
  )

  packageCompartmentGlobal.fetch = function sentryLikeFetchWrapper(
    url: unknown
  ) {
    return (
      'patched2!' +
      originalFetch.call(
        packageCompartmentGlobal as unknown as never,
        url as string
      )
    )
  }

  t.is(
    (packageCompartmentGlobal.fetch as (url: string) => string)(
      'https://example.com'
    ),
    'patched2!fetched(https://example.com) // object true'
  )
  t.is(
    (anotherPackageCompartmentGlobal.fetch as (url: string) => string)(
      'https://example.com'
    ),
    'patched2!fetched(https://example.com) // object true'
  )
})

test('getEndowmentsForConfig - writable global is not leaky', (t) => {
  'use strict'
  const knownWritable = new Set(['fetch'])
  const { getEndowmentsForConfig, copyWrappedGlobals } = prepareTest({
    knownWritable,
  })

  const browserGlobal: Record<string, unknown> = {}
  browserGlobal.fetch = function nativeFetch() {
    // whatever
  }

  const rootCompartmentGlobal = copyWrappedGlobals(
    browserGlobal,
    {}
  ) as typeof browserGlobal
  const packageCompartmentGlobal = getEndowmentsForConfig(
    rootCompartmentGlobal,
    { globals: { fetch: 'write' as const } },
    rootCompartmentGlobal
  ) as typeof browserGlobal

  const anotherPackageCompartmentGlobal = getEndowmentsForConfig(
    rootCompartmentGlobal,
    { globals: { fetch: true as const } },
    rootCompartmentGlobal
  ) as typeof browserGlobal

  packageCompartmentGlobal.fetch = function abuseRewrapping(this: unknown) {
    return [this]
  }

  const stolen = (packageCompartmentGlobal.fetch as () => unknown[])()
  t.not(stolen[0], browserGlobal)
  t.not(stolen[0], rootCompartmentGlobal)
  t.is(stolen[0], packageCompartmentGlobal)

  const anotherStolen = (
    anotherPackageCompartmentGlobal.fetch as () => unknown[]
  )()
  t.not(anotherStolen[0], browserGlobal)
  t.not(anotherStolen[0], rootCompartmentGlobal)
  t.is(anotherStolen[0], anotherPackageCompartmentGlobal)
})

test('getEndowmentsForConfig - specify unwrap to', (t) => {
  'use strict'
  const unwrapTo = {} as typeof sourceGlobal
  const { getEndowmentsForConfig } = prepareTest()
  const sourceGlobal = {
    get xyz() {
      return this
    },
  }
  const config = { globals: { xyz: true as const } }
  const resultGlobal = getEndowmentsForConfig(sourceGlobal, config, unwrapTo)
  const getter = Reflect.getOwnPropertyDescriptor(resultGlobal, 'xyz')!.get as (
    this: unknown
  ) => unknown

  t.is(resultGlobal.xyz, unwrapTo)
  t.is(getter.call(resultGlobal), unwrapTo)
  t.is(getter.call(sourceGlobal), sourceGlobal)
  t.is(getter.call(unwrapTo), unwrapTo)
  t.is(getter.call(undefined), undefined)
})

test('getEndowmentsForConfig - specify unwrap from and unwrap to', (t) => {
  'use strict'
  const unwrapTo = {}
  const unwrapFrom = {}
  const { getEndowmentsForConfig } = prepareTest()
  const sourceGlobal = {
    get xyz() {
      return this
    },
  }
  const config = { globals: { xyz: true as const } }
  const resultGlobal = getEndowmentsForConfig(
    sourceGlobal,
    config,
    unwrapTo,
    unwrapFrom
  )
  const getter = Reflect.getOwnPropertyDescriptor(resultGlobal, 'xyz')!.get as (
    this: unknown
  ) => unknown

  t.is(resultGlobal.xyz, resultGlobal as typeof sourceGlobal)
  t.is(getter.call(resultGlobal), resultGlobal)
  t.is(getter.call(sourceGlobal), sourceGlobal)
  t.is(getter.call(unwrapTo), unwrapTo)
  t.is(getter.call(unwrapFrom), unwrapTo)
  // In strict-mode ESM, calling with undefined keeps `this` as undefined
  t.is(getter.call(undefined), undefined)
})

test('getEndowmentsForConfig - endowing bind of a function', (t) => {
  'use strict'
  const { getEndowmentsForConfig } = prepareTest()
  const sourceGlobal = {
    abc: function (this: unknown) {
      return this
    },
  }
  const config = { globals: { 'abc.bind': true as const } }
  const resultGlobal = getEndowmentsForConfig(
    sourceGlobal,
    config
  ) as typeof sourceGlobal

  // the intermediate should actually be an object
  t.is(typeof resultGlobal.abc, 'object')
  // bind should work normally — call it on the intermediate object
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const abc = resultGlobal.abc as unknown as {
    bind: (thisArg?: unknown) => () => unknown
  }
  t.is(abc.bind()(), undefined)
  t.true(abc.bind(true)())
  t.is(abc.bind(42)(), 42)
  const xyz = {}
  t.is(abc.bind(xyz)(), xyz)
})

test('getEndowmentsForConfig - ensure setTimeout calls dont trigger illegal invocation', (t) => {
  'use strict'
  const { getEndowmentsForConfig } = prepareTest()
  const sourceGlobal = {
    setTimeout(this: unknown) {
      return this
    },
  }
  const config = { globals: { setTimeout: true as const } }
  const resultGlobal = getEndowmentsForConfig(
    sourceGlobal,
    config
  ) as typeof sourceGlobal

  t.is(resultGlobal.setTimeout(), sourceGlobal)
})

// ---------------------------------------------------------------------------
// copyWrappedGlobals
// ---------------------------------------------------------------------------

test('copyWrappedGlobals - support other realm prototype chains', (t) => {
  'use strict'
  const { copyWrappedGlobals } = prepareTest()
  const forkedProto = Object.create(null) as Record<string, unknown>
  forkedProto.hasOwnProperty = (): boolean => true
  forkedProto.legitimateValue = 1
  Object.defineProperty(forkedProto, 'aNonEnumerableValue', {
    value: 2,
    enumerable: false,
  })

  const sourceProto = Object.create(forkedProto) as Record<string, unknown>
  sourceProto.onTheProto = function () {}
  const source = Object.create(sourceProto) as Record<string, unknown>
  source.onTheObj = function () {}
  const target = Object.create(null) as Record<string, unknown>

  copyWrappedGlobals(source, target, ['window'])

  t.is(
    Object.getOwnPropertyNames(target).sort().join(),
    'aNonEnumerableValue,legitimateValue,onTheObj,onTheProto,window'
  )
})

test('copyWrappedGlobals - copy from prototype too', (t) => {
  'use strict'
  const { copyWrappedGlobals } = prepareTest()
  const sourceProto: Record<string, unknown> = {
    onTheProto: function () {},
  }
  Object.defineProperty(sourceProto, 'aNonEnumerableValue', {
    value: 2,
    enumerable: false,
  })
  const source = Object.create(sourceProto) as Record<string, unknown>
  source.onTheObj = function () {}
  const target = Object.create(null) as Record<string, unknown>
  copyWrappedGlobals(source, target, ['window'])

  t.is(
    Object.getOwnPropertyNames(target).sort().join(),
    'aNonEnumerableValue,onTheObj,onTheProto,window'
  )
})

test('copyWrappedGlobals - static methods on wrapped functions', (t) => {
  'use strict'
  const { copyWrappedGlobals } = prepareTest()
  const source: Record<string, unknown> = { Array, Uint8Array }
  const target = Object.create(null) as Record<string, unknown>
  copyWrappedGlobals(source, target)

  t.is(typeof (target.Array as typeof Array).from, 'function')
  t.is(typeof (target.Uint8Array as typeof Uint8Array).from, 'function')
})

// ---------------------------------------------------------------------------
// getBuiltinForConfig
// ---------------------------------------------------------------------------

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
  const policyBuiltin = { 'util.inspect.custom': true }
  const result = getBuiltinForConfig(moduleNamespace, 'util', policyBuiltin)

  t.is(result.inspect?.custom, customSymbol)
  t.is(result.inspect?.defaultOptions, undefined)
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
  t.is(result.extensions?.safe, 'yes')
  t.is(result.extensions?.dangerous, undefined)
})

// ---------------------------------------------------------------------------
// attenuateBuiltin
// ---------------------------------------------------------------------------

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
  const result = attenuateBuiltin(moduleNamespace, paths)

  t.is(result.parse, undefined)
  t.is(typeof result.stringify, 'function')
  t.is(result.extensions?.safe, 'yes')
  t.is(result.extensions?.dangerous, undefined)
})
