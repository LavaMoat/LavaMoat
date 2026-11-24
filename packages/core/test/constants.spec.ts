import test from 'ava'
import {
  DEFAULT_GLOBAL_THIS_REFS,
  GLOBAL_THIS_REFS,
  MODULE_REFS,
  POLICY_WRITE,
} from '../src/constants.ts'

test('GLOBAL_THIS_REFS contains expected keys', (t) => {
  t.deepEqual(Object.keys(GLOBAL_THIS_REFS), [
    'WINDOW',
    'SELF',
    'GLOBAL',
    'GLOBAL_THIS',
    'TOP',
    'FRAMES',
    'PARENT',
  ])
})

test('DEFAULT_GLOBAL_THIS_REFS contains expected values', (t) => {
  t.deepEqual([...DEFAULT_GLOBAL_THIS_REFS], [
    'window',
    'self',
    'global',
    'globalThis',
    'top',
    'frames',
    'parent',
  ])
})

test('POLICY_WRITE is "write"', (t) => {
  t.is(POLICY_WRITE, 'write')
})

test('MODULE_REFS has module and script entries', (t) => {
  t.true(Array.isArray(MODULE_REFS.module))
  t.true(Array.isArray(MODULE_REFS.script))
  t.true(MODULE_REFS.module.includes('import'))
  t.true(MODULE_REFS.script.includes('require'))
})

test('GLOBAL_THIS_REFS is frozen', (t) => {
  t.true(Object.isFrozen(GLOBAL_THIS_REFS))
})

test('DEFAULT_GLOBAL_THIS_REFS is frozen', (t) => {
  t.true(Object.isFrozen(DEFAULT_GLOBAL_THIS_REFS))
})
