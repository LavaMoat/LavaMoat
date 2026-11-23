import test from 'ava'
import { jsonStringifySortedPolicy } from '../src/stringify-policy.ts'
import type { LavaMoatPolicy } from '@lavamoat/types'

test('jsonStringifySortedPolicy - produces valid JSON', (t) => {
  const policy: LavaMoatPolicy = { resources: {} }
  const result = jsonStringifySortedPolicy(policy)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  t.notThrows(() => JSON.parse(result))
})

test('jsonStringifySortedPolicy - sorts top-level keys', (t) => {
  const policy: LavaMoatPolicy = {
    resources: { z: {}, a: {}, m: {} },
  }
  const result = jsonStringifySortedPolicy(policy)
  const parsed = JSON.parse(result) as LavaMoatPolicy
  t.deepEqual(Object.keys(parsed.resources), ['a', 'm', 'z'])
})

test('jsonStringifySortedPolicy - sorts parent>child keys by child first', (t) => {
  // "b>z" and "b>a" should sort near each other; reversed segments give "z<b" and "a<b"
  const policy: LavaMoatPolicy = {
    resources: { 'b>z': {}, 'a>a': {}, 'b>a': {} },
  }
  const result = jsonStringifySortedPolicy(policy)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const keys = Object.keys(JSON.parse(result).resources as object)
  // "a>a" → reversed "a<a"; "b>a" → "a<b"; "b>z" → "z<b"
  // sorted: "a<a" < "a<b" < "z<b"  ⟹ "a>a", "b>a", "b>z"
  t.deepEqual(keys, ['a>a', 'b>a', 'b>z'])
})

test('jsonStringifySortedPolicy - uses 2-space indentation', (t) => {
  const policy: LavaMoatPolicy = { resources: { foo: { globals: { x: true } } } }
  const result = jsonStringifySortedPolicy(policy)
  t.true(result.includes('  '))
  t.snapshot(result)
})

test('jsonStringifySortedPolicy - is deterministic across calls', (t) => {
  const policy: LavaMoatPolicy = {
    resources: { z: { globals: { z: true } }, a: { builtin: { fs: true } } },
  }
  const r1 = jsonStringifySortedPolicy(policy)
  const r2 = jsonStringifySortedPolicy(policy)
  t.is(r1, r2)
})
