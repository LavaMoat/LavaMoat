import test from 'ava'
import {
  devToConditions,
  hasValue,
  isArray,
  isBoolean,
  isObject,
  isObjectyObject,
  isReadNowPowers,
  isString,
  toEndoURL,
} from '../../src/util.js'

test('toURLString - converts URL to URL-like string', (t) => {
  const url = new URL('file:///test/path')
  t.is(toEndoURL(url), 'file:///test/path')
})

test('toURLString - converts path to URL-like string', (t) => {
  const filepath = '/test/path'
  const expected = 'file:///test/path'
  t.is(toEndoURL(filepath), expected)
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

test('devToConditions - returns development condition if dev is true', (t) => {
  t.deepEqual(devToConditions(true), new Set(['development']))
})

test('devToConditions - returns empty set if dev is false', (t) => {
  t.deepEqual(devToConditions(false), new Set())
})

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
