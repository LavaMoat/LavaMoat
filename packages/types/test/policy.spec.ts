/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-object-type, ava/no-ignored-test-files, ava/require-assertion */
/**
 * Tests for policy schema types
 *
 * These tests are not necessarily intended to be _run_, but they will fail to
 * pass `tsc` if any of them fail.
 *
 * @packageDocumentation
 */

import test from 'ava'
import { expectTypeOf } from 'expect-type'
import type { LavaMoatPolicy, Resources } from '../src'

/**
 * Given an object that looks like a policy, infer its type.
 *
 * @param policy Some policy-lookin' thing
 * @returns Same object, but with a type
 */
function infer<T extends Resources>(policy: LavaMoatPolicy<T>) {
  return policy
}

test('use of default type arguments does not validate root.usePolicy', () => {
  const policy = {
    root: {
      // no "bar"
      usePolicy: 'bar',
    },
    resources: {
      foo: {
        globals: {
          'console.log': true,
        },
      },
    },
  }

  expectTypeOf(policy).toExtend<LavaMoatPolicy>()
})

test('root usePolicy reference matches resource name', () => {
  // not inferred
  const badPolicy = {
    root: {
      // no "bar"
      usePolicy: 'bar',
    },
    resources: {
      foo: {
        globals: {
          'console.log': true,
        },
      },
    },
  }

  expectTypeOf(badPolicy).toExtend<
    // @ts-expect-error usePolicy must match a resource name
    LavaMoatPolicy<{ foo: { globals: { 'console.log': true } } }>
  >()

  const goodPolicy = infer({
    root: {
      usePolicy: 'foo',
    },
    resources: {
      foo: {
        globals: {
          'console.log': true,
        },
      },
    },
  })

  expectTypeOf<typeof goodPolicy>().toEqualTypeOf<
    LavaMoatPolicy<{ foo: { globals: { 'console.log': true } } }>
  >()
})

test('empty root resource is ok', () => {
  const goodPolicy = infer({
    root: {
      usePolicy: 'foo',
    },
    resources: {
      foo: {},
    },
  })

  expectTypeOf<typeof goodPolicy>().toEqualTypeOf<LavaMoatPolicy<{ foo: {} }>>()
})

test('resources is Resources', () => {
  const policy = infer({
    root: {
      usePolicy: 'foo',
    },
    resources: {
      foo: {
        globals: {
          'console.log': true,
        },
      },
    },
  })
  expectTypeOf<typeof policy.resources>().toExtend<Resources | undefined>()
})

test('root usePolicy reference may be omitted', (t) => {
  const policy = infer({
    root: {},
    resources: {
      foo: {},
    },
  })

  expectTypeOf(policy).toEqualTypeOf<LavaMoatPolicy<{ foo: {} }>>()
})

test('root may be omitted', (t) => {
  const policy = infer({
    resources: {
      foo: {},
    },
  })

  expectTypeOf(policy).toEqualTypeOf<LavaMoatPolicy<{ foo: {} }>>()
})
