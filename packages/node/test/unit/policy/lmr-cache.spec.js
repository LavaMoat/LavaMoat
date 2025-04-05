import test from 'ava'
import { LMRCache } from '../../../src/policy-gen/lmr-cache.js'
/**
 * @import {SimpleLavamoatModuleRecordOptions} from '../../../src/internal.js'
 */

/**
 * Creates a valid SimpleLavamoatModuleRecord object for testing.
 *
 * @returns {SimpleLavamoatModuleRecordOptions}
 */
const createLavamoatModuleRecord = () => ({
  specifier: './module.js',
  file: '/path/to/module.js',
  type: 'js',
  packageName: 'test-package',
})

test('LMRCache - cannot be instantiated via new keyword', (t) => {
  t.throws(
    () => {
      // @ts-expect-error naughty naughty
      new LMRCache()
    },
    {
      instanceOf: TypeError,
      message:
        'LMRCache cannot be instantiated directly; use LMRCache.create()',
    }
  )
})

test('LMRCache - create() creates a new instance', (t) => {
  const cache = LMRCache.create()
  t.truthy(cache)
  t.true(cache instanceof LMRCache)
})

test('LMRCache - add() adds a record to the cache', (t) => {
  const cache = LMRCache.create()
  const record = createLavamoatModuleRecord()
  cache.add(record)
  t.like(cache.get(record), record)
})

test('LMRCache - get() retrieves a record from the cache', (t) => {
  const cache = LMRCache.create()
  const record = createLavamoatModuleRecord()
  cache.add(record)
  const retrieved = cache.get(record)
  t.like(retrieved, record)
})

test('LMRCache - get() returns undefined for non-existent record', (t) => {
  const cache = LMRCache.create()
  const retrieved = cache.get(createLavamoatModuleRecord())
  t.is(retrieved, undefined)
})

test('LMRCache - has() returns true for existing record', (t) => {
  const cache = LMRCache.create()
  const record = createLavamoatModuleRecord()
  cache.add(record)
  t.true(cache.has(record))
})

test('LMRCache - has() returns false for non-existent record', (t) => {
  const cache = LMRCache.create()
  t.false(cache.has(createLavamoatModuleRecord()))
})

test('LMRCache - delete() should not exist', (t) => {
  t.throws(() => {
    const cache = LMRCache.create()
    const record = createLavamoatModuleRecord()
    cache.add(record)
    // @ts-expect-error no such method
    cache.delete(record)
  })
})

test('LMRCache - clear() should not exist', (t) => {
  t.throws(() => {
    const cache = LMRCache.create()
    const record = createLavamoatModuleRecord()
    cache.add(record)
    // @ts-expect-error no such method
    cache.clear()
  })
})
