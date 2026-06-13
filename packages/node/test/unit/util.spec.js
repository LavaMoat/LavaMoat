import test from 'ava'
import { Volume } from 'memfs'
import { makeLavaMoatReadPowers } from '../../src/compartment/power.js'
import {
  prodOnlyToConditions,
  hasValue,
  isArray,
  isBoolean,
  isObject,
  isObjectyObject,
  isReadNowPowers,
  isString,
  pluralize,
  readEntryPackageDescriptor,
  toFileURLString,
} from '../../src/util.js'

/**
 * @import {FsInterface} from "@endo/compartment-mapper"
 */

test('toURLString - converts URL to URL-like string', (t) => {
  const url = new URL('file:///test/path')
  t.is(toFileURLString(url), 'file:///test/path')
})

test('toURLString - converts path to URL-like string', (t) => {
  const filepath = '/test/path'
  const expected = 'file:///test/path'
  t.is(toFileURLString(filepath), expected)
})

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

test('isObjectyObject - returns true for plain objects', (t) => {
  t.true(isObjectyObject({}))
})

test('isObjectyObject - returns true for objects having a non-Object prototype', (t) => {
  t.plan(2)
  t.true(isObjectyObject(/foo/))
  t.true(isObjectyObject(new Date()))
})

test('isObjectyObject - returns false for non-plain objects', (t) => {
  t.plan(5)
  t.false(isObjectyObject([]))
  t.false(isObjectyObject(null))
  t.false(isObjectyObject(undefined))
  t.false(isObjectyObject(42))
  t.false(isObjectyObject('string'))
})

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

test('isArray - returns true for arrays', (t) => {
  t.true(isArray([]))
})

test('isArray - returns false for non-arrays', (t) => {
  t.plan(6)
  t.false(isArray({}))
  t.false(isArray(new Date()))
  t.false(isArray(null))
  t.false(isArray(undefined))
  t.false(isArray(42))
  t.false(isArray('string'))
})

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

test('prodOnlyToConditions - returns empty set if prodOnly is true', (t) => {
  t.deepEqual(prodOnlyToConditions(true), new Set())
})

test('prodOnlyToConditions - returns development condition if prodOnly is false', (t) => {
  t.deepEqual(prodOnlyToConditions(false), new Set(['development']))
})

test('isReadNowPowers - returns true for valid ReadNowPowers', (t) => {
  const validReadNowPowers = {
    fileURLToPath: () => {},
    isAbsolute: () => {},
    maybeReadNow: () => {},
    maybeRead: () => {},
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

test('pluralize - returns singular form when count is 1', (t) => {
  t.is(pluralize(1, 'item'), 'item')
})

test('pluralize - returns plural form when count is not 1', (t) => {
  t.plan(3)
  t.is(pluralize(0, 'item'), 'items')
  t.is(pluralize(5, 'item'), 'items')
  t.is(pluralize(2, 'ox', 'oxen'), 'oxen')
})

// readEntryPackageDescriptor

test('readEntryPackageDescriptor - reads package.json in the same directory as entrypoint', async (t) => {
  const vol = Volume.fromJSON({
    '/app/package.json': JSON.stringify({ name: 'my-app', version: '1.0.0' }),
    '/app/index.js': '',
  })
  const readPowers = makeLavaMoatReadPowers({
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
  const readPowers = makeLavaMoatReadPowers({
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
  const readPowers = makeLavaMoatReadPowers({
    fs: /** @type {FsInterface} */ (vol),
  })

  await t.throwsAsync(
    () => readEntryPackageDescriptor(readPowers, 'file:///lonely/index.js'),
    { instanceOf: Error, message: /Cannot find package\.json/ }
  )
})

test('readEntryPackageDescriptor - accepts a URL object as entrypoint', async (t) => {
  const vol = Volume.fromJSON({
    '/app/package.json': JSON.stringify({ name: 'url-app' }),
    '/app/main.js': '',
  })
  const readPowers = makeLavaMoatReadPowers({
    fs: /** @type {FsInterface} */ (vol),
  })

  const result = await readEntryPackageDescriptor(
    readPowers,
    new URL('file:///app/main.js')
  )

  t.is(result.name, 'url-app')
})
