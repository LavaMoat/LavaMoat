import '../../src/preamble.js'

import test from 'ava'
import { DEFAULT_POLICY_FILENAME } from '../../src/constants.js'
import { isPolicy, readPolicy } from '../../src/policy-util.js'
import { fixtureFinder } from '../test-util.js'
import { createCLIMacros } from './cli-macros.js'
import { makeTempdir, runCLI } from './cli-util.js'

const fixture = fixtureFinder(import.meta.url)

const basic = fixture('basic')
const bin = fixture('bin', { entrypoint: 'lard-o-matic' })
const deptree = fixture('deptree')

const { testCLI } = createCLIMacros(test)

test('"run --help" prints help', testCLI, ['run', '--help'])

test(
  'missing entrypoint',
  testCLI,
  ['run'],
  async (t, { code, stderr, stdout }) => {
    t.plan(3)
    t.is(code, 1)
    t.is(stdout, '')
    t.regex(stderr, /Not enough non-option arguments: got 0, need at least 1/)
  }
)

test(
  'basic',
  testCLI,
  ['run', basic.entrypoint, '--project-root', basic.dir],
  'hello world'
)

test(
  'extra positionals',
  testCLI,
  ['run', basic.entrypoint, '--project-root', basic.dir, 'howdy'],
  { code: 1, stderr: /unknown argument/i }
)

test(
  'extra non-option arguments (positionals)',
  testCLI,
  ['run', basic.entrypoint, '--project-root', basic.dir, '--', 'howdy'],
  'howdy world'
)

test(
  'extra non-option arguments (positionals and options)',
  testCLI,
  [
    'run',
    basic.entrypoint,
    '--project-root',
    basic.dir,
    '--',
    'howdy',
    '--yelling',
  ],
  'HOWDY WORLD'
)

test(
  'untrusted entrypoint',
  testCLI,
  ['run', bin.entrypoint, '--bin', '--project-root', bin.dir],
  'scripty test'
)

test.todo('--dev flag')

test.todo('package missing from all package descriptors')

test.todo('package missing from disk')

test.todo('package only present in policy override')

test.todo('entry module is depended upon by a descendant')

test('overrides merged back into policy', async (t) => {
  t.plan(2)

  const tempdir = await makeTempdir(t)

  try {
    const policyPath = tempdir.join(
      `run-override-merge-${DEFAULT_POLICY_FILENAME}`
    )

    await runCLI(
      [
        deptree.entrypoint,
        '--policy',
        policyPath,
        '--policy-override',
        deptree.policyOverridePath,
        '--generate-recklessly',
        '--write',
      ],
      t,
      { cwd: deptree.dir }
    )

    const policy = await readPolicy(policyPath)
    t.true(isPolicy(policy))

    t.like(policy, {
      resources: {
        'another-pkg': {
          globals: {
            'console.error': true,
            'console.log': true,
          },
        },
      },
    })
  } finally {
    await tempdir[Symbol.asyncDispose]()
  }
})
