import test from 'ava'
import {
  LavamoatModuleRecord,
  ROOT_SLUG,
} from '../src/module-record.ts'

test('ROOT_SLUG is $root$', (t) => {
  t.is(ROOT_SLUG, '$root$')
})

test('LavamoatModuleRecord - basic construction', (t) => {
  const record = new LavamoatModuleRecord({
    specifier: './index.js',
    file: './index.js',
    type: 'js',
    packageName: 'my-package',
    content: 'module.exports = {}',
  })
  t.is(record.specifier, './index.js')
  t.is(record.file, './index.js')
  t.is(record.type, 'js')
  t.is(record.packageName, 'my-package')
  t.is(record.content, 'module.exports = {}')
  t.deepEqual(record.importMap, {})
  t.false(record.isRoot)
})

test('LavamoatModuleRecord - isRoot is true when packageName is ROOT_SLUG', (t) => {
  const record = new LavamoatModuleRecord({
    specifier: './entry.js',
    file: './entry.js',
    type: 'js',
    packageName: ROOT_SLUG,
  })
  t.true(record.isRoot)
})

test('LavamoatModuleRecord - explicit isRoot=true', (t) => {
  const record = new LavamoatModuleRecord({
    specifier: './entry.js',
    file: './entry.js',
    type: 'js',
    packageName: 'some-package',
    isRoot: true,
  })
  t.true(record.isRoot)
})

test('LavamoatModuleRecord - importMap defaults to empty object', (t) => {
  const record = new LavamoatModuleRecord({
    specifier: './index.js',
    file: './index.js',
    type: 'js',
    packageName: 'pkg',
  })
  t.deepEqual(record.importMap, {})
})

test('LavamoatModuleRecord - importMap is preserved when given', (t) => {
  const importMap = { './dep': './node_modules/dep/index.js' }
  const record = new LavamoatModuleRecord({
    specifier: './index.js',
    file: './index.js',
    type: 'js',
    packageName: 'pkg',
    importMap,
  })
  t.is(record.importMap, importMap)
})

test('LavamoatModuleRecord - builtin type', (t) => {
  const record = new LavamoatModuleRecord({
    specifier: 'fs',
    file: 'fs',
    type: 'builtin',
    packageName: 'fs',
  })
  t.is(record.type, 'builtin')
  t.false(record.isRoot)
})
