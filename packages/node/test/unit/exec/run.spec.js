import '../../../src/preamble.js'

import test from 'ava'
import { run } from '../../../src/exec/run.js'

test('root trust mismatch (untrusted root)', async (t) => {
  await t.throwsAsync(
    run('/some/file.js', {
      policy: {
        resources: {
          foo: {},
        },
        root: {
          usePolicy: 'foo',
        },
      },
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
      policy: {
        resources: {
          foo: {},
        },
      },
      trustRoot: false,
    }),
    {
      message: /policy expects a trusted root/,
    }
  )
})
