import test from 'ava'
import path from 'node:path'
import {
  getInstalledPackageName,
  normalizeBin,
  resolveBin,
} from '../../src/resolve-bin.js'
import {
  AmbiguousBinScriptError,
  NoBinScriptError,
  UnknownPackageError,
} from '../../src/error.js'

test('normalizeBin - string maps to unscoped name', (t) => {
  t.deepEqual(normalizeBin('cowsay', './cli.js'), { cowsay: './cli.js' })
})

test('normalizeBin - scoped string maps to unscoped name', (t) => {
  t.deepEqual(normalizeBin('@scope/foo', 'bin.js'), { foo: 'bin.js' })
})

test('normalizeBin - object passes through string values', (t) => {
  t.deepEqual(normalizeBin('pkg', { a: 'a.js', b: 'b.js' }), {
    a: 'a.js',
    b: 'b.js',
  })
})

test('normalizeBin - undefined yields empty map', (t) => {
  t.deepEqual(normalizeBin('pkg', undefined), {})
})

/**
 * @param {unknown} value
 * @returns {any}
 */
const asReadJson = (value) => async () => value

/** @type {any} */
const existsTrue = async () => true
/** @type {any} */
const existsFalse = async () => false

test('getInstalledPackageName - prefers matching hint', async (t) => {
  const readJson = asReadJson({ dependencies: { cowsay: '^1', other: '^2' } })
  t.is(
    await getInstalledPackageName('/sb', { hint: 'cowsay', readJson }),
    'cowsay'
  )
})

test('getInstalledPackageName - single dependency', async (t) => {
  const readJson = asReadJson({ dependencies: { cowsay: '^1' } })
  t.is(await getInstalledPackageName('/sb', { readJson }), 'cowsay')
})

test('getInstalledPackageName - falls back to hint when not in deps', async (t) => {
  const readJson = asReadJson({ dependencies: {} })
  t.is(await getInstalledPackageName('/sb', { hint: 'x', readJson }), 'x')
})

test('getInstalledPackageName - throws when indeterminate', async (t) => {
  const readJson = asReadJson({ dependencies: { a: '1', b: '2' } })
  await t.throwsAsync(getInstalledPackageName('/sb', { readJson }), {
    instanceOf: UnknownPackageError,
  })
})

test('resolveBin - single string bin', async (t) => {
  const readJson = asReadJson({ name: 'cowsay', bin: './cli.js' })
  const result = await resolveBin('/sb', 'cowsay', {
    readJson,
    exists: existsTrue,
  })
  t.is(result.binName, 'cowsay')
  t.is(
    result.binPath,
    path.resolve('/sb', 'node_modules', 'cowsay', './cli.js')
  )
})

test('resolveBin - object bin matching unscoped name', async (t) => {
  const readJson = asReadJson({
    name: '@scope/foo',
    bin: { foo: 'foo.js', helper: 'helper.js' },
  })
  const result = await resolveBin('/sb', '@scope/foo', {
    readJson,
    exists: existsTrue,
  })
  t.is(result.binName, 'foo')
})

test('resolveBin - sole bin chosen when name does not match', async (t) => {
  const readJson = asReadJson({ name: 'pkg', bin: { only: 'only.js' } })
  const result = await resolveBin('/sb', 'pkg', {
    readJson,
    exists: existsTrue,
  })
  t.is(result.binName, 'only')
})

test('resolveBin - explicit call', async (t) => {
  const readJson = asReadJson({ name: 'pkg', bin: { a: 'a.js', b: 'b.js' } })
  const result = await resolveBin('/sb', 'pkg', {
    call: 'b',
    readJson,
    exists: existsTrue,
  })
  t.is(result.binName, 'b')
})

test('resolveBin - throws on unknown call', async (t) => {
  const readJson = asReadJson({ name: 'pkg', bin: { a: 'a.js' } })
  await t.throwsAsync(
    resolveBin('/sb', 'pkg', { call: 'nope', readJson, exists: existsTrue }),
    { instanceOf: NoBinScriptError }
  )
})

test('resolveBin - throws when no bin', async (t) => {
  const readJson = asReadJson({ name: 'pkg' })
  await t.throwsAsync(
    resolveBin('/sb', 'pkg', { readJson, exists: existsTrue }),
    { instanceOf: NoBinScriptError }
  )
})

test('resolveBin - throws on ambiguous bins', async (t) => {
  const readJson = asReadJson({ name: 'pkg', bin: { a: 'a.js', b: 'b.js' } })
  await t.throwsAsync(
    resolveBin('/sb', 'pkg', { readJson, exists: existsTrue }),
    { instanceOf: AmbiguousBinScriptError }
  )
})

test('resolveBin - throws when bin file missing', async (t) => {
  const readJson = asReadJson({ name: 'pkg', bin: './cli.js' })
  await t.throwsAsync(
    resolveBin('/sb', 'pkg', { readJson, exists: existsFalse }),
    { instanceOf: NoBinScriptError }
  )
})
