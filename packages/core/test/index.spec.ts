/**
 * Smoke-tests that all expected symbols are re-exported from the package
 * barrel (`src/index.ts`).
 *
 * Note: this spec imports from `dist/` because the barrel uses `.js` import
 * extensions (required for tsc compilation), which cannot be resolved by
 * Node.js native type stripping. `pretest` ensures `dist/` is always fresh.
 */
import test from 'ava'
import {
  ROOT_SLUG,
  LavamoatModuleRecord,
  jsonStringifySortedPolicy,
  compactPolicyOverride,
  codeSampleFromAstNode,
  POLICY_WRITE,
  DEFAULT_GLOBAL_THIS_REFS,
  MODULE_REFS,
} from '../dist/index.js'

test('index re-exports ROOT_SLUG', (t) => {
  t.is(ROOT_SLUG, '$root$')
})

test('index re-exports LavamoatModuleRecord', (t) => {
  t.is(typeof LavamoatModuleRecord, 'function')
})

test('index re-exports jsonStringifySortedPolicy', (t) => {
  t.is(typeof jsonStringifySortedPolicy, 'function')
})

test('index re-exports compactPolicyOverride', (t) => {
  t.is(typeof compactPolicyOverride, 'function')
})

test('index re-exports codeSampleFromAstNode', (t) => {
  t.is(typeof codeSampleFromAstNode, 'function')
})

test('index re-exports POLICY_WRITE', (t) => {
  t.is(POLICY_WRITE, 'write')
})

test('index re-exports DEFAULT_GLOBAL_THIS_REFS', (t) => {
  t.true(Array.isArray(DEFAULT_GLOBAL_THIS_REFS))
})

test('index re-exports MODULE_REFS', (t) => {
  t.is(typeof MODULE_REFS, 'object')
})
