import '../../../src/preamble.js'

import test from 'ava'
import { run } from '../../../src/exec/run.js'
import {
  policyInput,
  policyOverrideNone,
  policySourceFromInline,
} from '../../../src/policy-input.js'

test('root trust mismatch (untrusted root)', async (t) => {
  await t.throwsAsync(
    run('/some/file.js', {
      policies: policyInput({
        policy: policySourceFromInline({
          resources: {
            foo: {},
          },
          root: {
            usePolicy: 'foo',
          },
        }),
        override: policyOverrideNone(),
      }),
      trustRoot: true,
    }),
    {
      message: /policy expects an untrusted root/,
    }
  )
})

test('root trust mismatch (trusted root)', async (t) => {
  await t.throwsAsync(
    run('/some/file.js', {
      policies: policyInput({
        policy: policySourceFromInline({
          resources: {
            foo: {},
          },
        }),
        override: policyOverrideNone(),
      }),
      trustRoot: false,
    }),
    {
      message: /policy expects a trusted root/,
    }
  )
})
