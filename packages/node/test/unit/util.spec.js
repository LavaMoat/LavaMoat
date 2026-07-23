import test from 'ava'
import { Volume } from 'memfs'
import { makeReadPowers } from '../../src/compartment/power.js'
import {
  findCanonicalNameKeypath,
  hasValue,
  isBoolean,
  isIncludeEntryByLocation,
  isIncludeEntryByName,
  isNonArrayObject,
  isObject,
  isReadNowPowers,
  isString,
  pluralize,
  prodOnlyToConditions,
  readEntryPackageDescriptor,
  toFileURLString,
  toKeypath,
} from '../../src/util.js'

/**
 * @import {FsInterface} from '@endo/compartment-mapper'
 */

// #region toURLString
test('toURLString - converts URL to URL-like string', (t) => {
  const url = new URL('file:///test/path')
  t.is(toFileURLString(url), 'file:///test/path')
})

test('toURLString - converts path to URL-like string', (t) => {
  const filepath = '/test/path'
  const expected = 'file:///test/path'
  t.is(toFileURLString(filepath), expected)
})
// #endregion

// #region isObject
test('isObject - returns true for objects', (t) => {
  t.plan(3)
  t.true(isObject({}))
  t.true(isObject([]))
  t.true(isObject(new Date()))
})

test('isObject - returns false for non-objects', (t) => {
  t.plan(5)
  t.false(isObject(null))
  t.false(isObject(undefined))
  t.false(isObject(42))
  t.false(isObject('string'))
  t.false(isObject(true))
})
// #endregion

// #region isNonArrayObject
test('isNonArrayObject - returns true for plain objects', (t) => {
  t.true(isNonArrayObject({}))
})

test('isNonArrayObject - returns true for functions', (t) => {
  t.true(isNonArrayObject(() => {}))
})

test('isNonArrayObject - returns true for objects having a non-Object prototype', (t) => {
  t.plan(2)
  t.true(isNonArrayObject(/foo/))
  t.true(isNonArrayObject(new Date()))
})

test('isNonArrayObject - returns false for non-plain objects', (t) => {
  t.plan(5)
  t.false(isNonArrayObject([]))
  t.false(isNonArrayObject(null))
  t.false(isNonArrayObject(undefined))
  t.false(isNonArrayObject(42))
  t.false(isNonArrayObject('string'))
})
// #endregion

// #region isString
test('isString - returns true for strings', (t) => {
  t.plan(2)
  t.true(isString('string'))
  t.true(isString(''))
})

test('isString - returns false for non-strings', (t) => {
  t.plan(6)
  t.false(isString(42))
  t.false(isString({}))
  t.false(isString([]))
  t.false(isString(null))
  t.false(isString(undefined))
  t.false(isString(true))
})
// #endregion

// #region isBoolean
test('isBoolean - returns true for booleans', (t) => {
  t.plan(2)
  t.true(isBoolean(true))
  t.true(isBoolean(false))
})

test('isBoolean - returns false for non-booleans', (t) => {
  t.plan(6)
  t.false(isBoolean(42))
  t.false(isBoolean({}))
  t.false(isBoolean([]))
  t.false(isBoolean(null))
  t.false(isBoolean(undefined))
  t.false(isBoolean('string'))
})
// #endregion

// #region hasValue
test('hasValue - returns true if object has property with value', (t) => {
  const obj = { key: 'value' }
  t.true(hasValue(obj, 'key'))
})

test('hasValue - returns false if object has property but no value', (t) => {
  const obj = { key: undefined }
  t.false(hasValue(obj, 'key'))
})

test('hasValue - returns false if object does not have value', (t) => {
  const obj = { key: 'value' }
  t.false(hasValue(obj, 'nonexistent'))
})
// #endregion

// #region prodOnlyToConditions
test('prodOnlyToConditions - returns empty set if prodOnly is true', (t) => {
  t.deepEqual(prodOnlyToConditions(true), new Set())
})

test('prodOnlyToConditions - returns development condition if prodOnly is false', (t) => {
  t.deepEqual(prodOnlyToConditions(false), new Set(['development']))
})
// #endregion

// #region isReadNowPowers
test('isReadNowPowers - returns true for valid ReadNowPowers', (t) => {
  const validReadNowPowers = {
    fileURLToPath: () => {},
    isAbsolute: () => {},
    maybeReadNow: () => {},
  }
  t.true(isReadNowPowers(validReadNowPowers))
})

test('isReadNowPowers - returns false for invalid ReadNowPowers', (t) => {
  const invalidReadNowPowers = {
    fileURLToPath: () => {},
    isAbsolute: () => {},
  }
  t.false(isReadNowPowers(invalidReadNowPowers))
})
// #endregion

// #region pluralize
test('pluralize - returns singular form when count is 1', (t) => {
  t.is(pluralize(1, 'item'), 'item')
})

test('pluralize - returns plural form when count is not 1', (t) => {
  t.plan(3)
  t.is(pluralize(0, 'item'), 'items')
  t.is(pluralize(5, 'item'), 'items')
  t.is(pluralize(2, 'ox', 'oxen'), 'oxen')
})
// #endregion

// #region isIncludeEntryByLocation
test('isIncludeEntryByLocation - returns true for object with relative location', (t) => {
  t.true(isIncludeEntryByLocation({ location: 'some/relative/path' }))
})

test('isIncludeEntryByLocation - returns true for object with location and valid modules array', (t) => {
  t.true(
    isIncludeEntryByLocation({
      location: 'some/relative/path',
      modules: ['foo.js', 'bar.js'],
    })
  )
})

test('isIncludeEntryByLocation - returns false for non-object values', (t) => {
  t.plan(5)
  t.false(isIncludeEntryByLocation(null))
  t.false(isIncludeEntryByLocation(undefined))
  t.false(isIncludeEntryByLocation(42))
  t.false(isIncludeEntryByLocation('some/path'))
  t.false(isIncludeEntryByLocation([]))
})

test('isIncludeEntryByLocation - returns false for object missing location', (t) => {
  t.false(isIncludeEntryByLocation({ name: 'my-package' }))
})

test('isIncludeEntryByLocation - returns false for object with absolute location', (t) => {
  t.false(isIncludeEntryByLocation({ location: '/absolute/path' }))
})

test('isIncludeEntryByLocation - returns false for object with non-string location', (t) => {
  t.false(isIncludeEntryByLocation({ location: 123 }))
})

test('isIncludeEntryByLocation - returns false for object with empty location', (t) => {
  t.false(isIncludeEntryByLocation({ location: '' }))
})

test('isIncludeEntryByLocation - returns false when modules contains an empty string', (t) => {
  t.false(
    isIncludeEntryByLocation({ location: 'some/relative/path', modules: [''] })
  )
})

test('isIncludeEntryByLocation - returns false when modules contains an absolute path', (t) => {
  t.false(
    isIncludeEntryByLocation({
      location: 'some/relative/path',
      modules: ['/absolute/module.js'],
    })
  )
})

test('isIncludeEntryByLocation - returns false when modules is not an array', (t) => {
  t.false(
    isIncludeEntryByLocation({
      location: 'some/relative/path',
      modules: 'not-an-array',
    })
  )
})

test('isIncludeEntryByLocation - returns false when modules contains non-string entries', (t) => {
  t.false(
    isIncludeEntryByLocation({
      location: 'some/relative/path',
      modules: [42],
    })
  )
})
// #endregion

// #region isIncludeEntryByName
test('isIncludeEntryByName - returns true for object with name', (t) => {
  t.true(isIncludeEntryByName({ name: 'my-package' }))
})

test('isIncludeEntryByName - returns true for object with name and valid modules array', (t) => {
  t.true(
    isIncludeEntryByName({ name: 'my-package', modules: ['foo.js', 'bar.js'] })
  )
})

test('isIncludeEntryByName - returns false for non-object values', (t) => {
  t.plan(5)
  t.false(isIncludeEntryByName(null))
  t.false(isIncludeEntryByName(undefined))
  t.false(isIncludeEntryByName(42))
  t.false(isIncludeEntryByName('my-package'))
  t.false(isIncludeEntryByName([]))
})

test('isIncludeEntryByName - returns false for object missing name', (t) => {
  t.false(isIncludeEntryByName({ location: 'some/path' }))
})

test('isIncludeEntryByName - returns false for object with non-string name', (t) => {
  t.false(isIncludeEntryByName({ name: 123 }))
})

test('isIncludeEntryByName - returns false for object with empty name', (t) => {
  t.false(isIncludeEntryByName({ name: '' }))
})

test('isIncludeEntryByName - returns false when modules contains an empty string', (t) => {
  t.false(isIncludeEntryByName({ name: 'my-package', modules: [''] }))
})

test('isIncludeEntryByName - returns false when modules contains an absolute path', (t) => {
  t.false(
    isIncludeEntryByName({
      name: 'my-package',
      modules: ['/absolute/module.js'],
    })
  )
})

test('isIncludeEntryByName - returns false when modules is not an array', (t) => {
  t.false(isIncludeEntryByName({ name: 'my-package', modules: 'not-an-array' }))
})

test('isIncludeEntryByName - returns false when modules contains non-string entries', (t) => {
  t.false(isIncludeEntryByName({ name: 'my-package', modules: [42] }))
})
// #endregion

// #region readEntryPackageDescriptor
test('readEntryPackageDescriptor - reads package.json in the same directory as entrypoint', async (t) => {
  const vol = Volume.fromJSON({
    '/app/package.json': JSON.stringify({ name: 'my-app', version: '1.0.0' }),
    '/app/index.js': '',
  })
  const readPowers = makeReadPowers({
    fs: /** @type {FsInterface} */ (vol),
  })

  const result = await readEntryPackageDescriptor(
    readPowers,
    'file:///app/index.js'
  )

  t.is(result.name, 'my-app')
  t.is(result.version, '1.0.0')
})

test('readEntryPackageDescriptor - walks up to a parent directory to find package.json', async (t) => {
  const vol = Volume.fromJSON({
    '/workspace/package.json': JSON.stringify({ name: 'workspace-root' }),
    '/workspace/src/deep/index.js': '',
  })
  const readPowers = makeReadPowers({
    fs: /** @type {FsInterface} */ (vol),
  })

  const result = await readEntryPackageDescriptor(
    readPowers,
    'file:///workspace/src/deep/index.js'
  )

  t.is(result.name, 'workspace-root')
})

test('readEntryPackageDescriptor - throws when no package.json exists along the path', async (t) => {
  const vol = Volume.fromJSON({
    '/lonely/index.js': '',
  })
  const readPowers = makeReadPowers({
    fs: /** @type {FsInterface} */ (vol),
  })

  await t.throwsAsync(
    () => readEntryPackageDescriptor(readPowers, 'file:///lonely/index.js'),
    { instanceOf: Error, message: /Cannot find/ }
  )
})

test('readEntryPackageDescriptor - accepts a URL object as entrypoint', async (t) => {
  const vol = Volume.fromJSON({
    '/app/package.json': JSON.stringify({ name: 'url-app' }),
    '/app/main.js': '',
  })
  const readPowers = makeReadPowers({
    fs: /** @type {FsInterface} */ (vol),
  })

  const result = await readEntryPackageDescriptor(
    readPowers,
    new URL('file:///app/main.js')
  )

  t.is(result.name, 'url-app')
})
// #endregion

// #region toKeypath
test('toKeypath - formats integer-like keys with bracket notation', (t) => {
  t.is(toKeypath(['some', 'object', '0', 'key']), 'some.object[0].key')
})

test('toKeypath - mixes bracket and dot notation in a single path', (t) => {
  t.is(toKeypath(['a', '0', '.c']), 'a[0][".c"]')
})

test('toKeypath - wraps leading-zero numbers in bracket string notation', (t) => {
  t.is(toKeypath(['some', 'object', '01', 'key']), 'some.object["01"].key')
})

test('toKeypath - strips double-quotes from integer-like keys before formatting', (t) => {
  t.is(toKeypath(['some', 'object', '"0"', 'key']), 'some.object[0].key')
})

test('toKeypath - strips single-quotes from integer-like keys before formatting', (t) => {
  t.is(toKeypath(['some', 'object', "'0'", 'key']), 'some.object[0].key')
})

test('toKeypath - wraps keys containing dashes in bracket double-quote notation', (t) => {
  t.is(
    toKeypath(['some', 'object', 'key-with-dash']),
    'some.object["key-with-dash"]'
  )
})

test('toKeypath - strips double-quotes from non-identifier keys and re-wraps in brackets', (t) => {
  t.is(
    toKeypath(['some', 'object', '"key-with-dash"']),
    'some.object["key-with-dash"]'
  )
})

test('toKeypath - strips single-quotes from non-identifier keys and re-wraps in brackets', (t) => {
  t.is(
    toKeypath(['some', 'object', "'key-with-dash'"]),
    'some.object["key-with-dash"]'
  )
})

test('toKeypath - formats plain identifier keys with dot notation', (t) => {
  t.is(toKeypath(['some', 'object', 'key']), 'some.object.key')
})

test('toKeypath - strips double-quotes from identifier keys and uses dot notation', (t) => {
  t.is(toKeypath(['some', 'object', '"key"']), 'some.object.key')
})

test('toKeypath - strips single-quotes from identifier keys and uses dot notation', (t) => {
  t.is(toKeypath(['some', 'object', "'key'"]), 'some.object.key')
})

test('toKeypath - formats reserved JS keywords with dot notation', (t) => {
  t.is(
    toKeypath(['import', 'default', 'constructor']),
    'import.default.constructor'
  )
})

test('toKeypath - returns empty string for an empty path', (t) => {
  t.is(toKeypath([]), '')
})

test('toKeypath - returns empty string if no parameters are provided', (t) => {
  t.is(toKeypath(), '')
})
// #endregion

// #region findCanonicalNameKeypath
test('findCanonicalNameKeypath - returns keypath for a direct resource with a non-identifier name', (t) => {
  const policy = { resources: { 'some-package': {} } }
  t.is(
    findCanonicalNameKeypath(policy, 'some-package'),
    'resources["some-package"]'
  )
})

test('findCanonicalNameKeypath - returns keypath for a direct resource with an identifier name', (t) => {
  const policy = { resources: { somePackage: {} } }
  t.is(findCanonicalNameKeypath(policy, 'somePackage'), 'resources.somePackage')
})

test('findCanonicalNameKeypath - returns keypath for a name nested under a resource packages map', (t) => {
  const policy = {
    resources: {
      parent: { packages: { child: true } },
    },
  }
  t.is(
    findCanonicalNameKeypath(policy, 'child'),
    'resources.parent.packages.child'
  )
})

test('findCanonicalNameKeypath - returns keypath for a named include entry at index 0', (t) => {
  const policy = {
    resources: {},
    include: [{ name: 'some-package' }],
  }
  t.is(
    findCanonicalNameKeypath(policy, 'some-package'),
    'include[0]["some-package"]'
  )
})

test('findCanonicalNameKeypath - returns keypath for a named include entry at a non-zero index', (t) => {
  const policy = {
    resources: {},
    include: [{ name: 'other-package' }, { name: 'some-package' }],
  }
  t.is(
    findCanonicalNameKeypath(policy, 'some-package'),
    'include[1]["some-package"]'
  )
})

test('findCanonicalNameKeypath - returns keypath for a string include entry', (t) => {
  const policy = {
    resources: {},
    include: ['some-package'],
  }
  t.is(
    findCanonicalNameKeypath(policy, 'some-package'),
    'include[0]["some-package"]'
  )
})

test('findCanonicalNameKeypath - prefers a direct resource match over an include match', (t) => {
  const policy = {
    resources: { 'some-package': {} },
    include: [{ name: 'some-package' }],
  }
  t.is(
    findCanonicalNameKeypath(policy, 'some-package'),
    'resources["some-package"]'
  )
})

test('findCanonicalNameKeypath - returns undefined when the canonical name is not found anywhere', (t) => {
  const policy = { resources: {} }
  t.is(findCanonicalNameKeypath(policy, 'missing-package'), undefined)
})

test('findCanonicalNameKeypath - returns undefined when include is absent and resources is empty', (t) => {
  const policy = { resources: {} }
  t.is(findCanonicalNameKeypath(policy, 'anything'), undefined)
})
// #endregion
