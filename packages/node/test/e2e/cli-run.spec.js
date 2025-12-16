import '../../src/preamble.js'

import test from 'ava'
import {
  DEFAULT_POLICY_FILENAME,
  DEFAULT_POLICY_OVERRIDE_FILENAME,
} from '../../src/constants.js'
import { isPolicy, readPolicy } from '../../src/policy-util.js'
import { fixtureFinder } from '../test-util.js'
import { createCLIMacros } from './cli-macros.js'
import { makeTempdir, runCLI } from './cli-util.js'

const fixture = fixtureFinder(import.meta.url)

const basic = fixture('basic')
const echo = fixture('basic', { entrypoint: 'echo.js' })
const bin = fixture('bin', { entrypoint: 'lard-o-matic' })
const deptree = fixture('deptree')
const devDeptree = fixture('deptree', { entrypoint: 'tool.js' })
const missingFromDisk = fixture('missing-from-disk')
const missingFromDescriptors = fixture('missing-from-descriptors')

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
  'extra non-option arguments are passed cleanly (positionals and options)',
  testCLI,
  [
    'run',
    echo.entrypoint,
    '--project-root',
    echo.dir,
    '--',
    'howdy',
    '--yelling',
  ],
  'howdy --yelling'
)

test(
  'untrusted entrypoint',
  testCLI,
  ['run', bin.entrypoint, '--bin', '--project-root', bin.dir],
  'scripty test'
)

test(
  'package missing from all package descriptors',
  testCLI,
  [
    'run',
    missingFromDescriptors.entrypoint,
    '--project-root',
    missingFromDescriptors.dir,
  ],
  { code: 1, stderr: /Cannot find package 'undeclared-dep'/ }
)

test(
  'package missing from disk',
  testCLI,
  ['run', missingFromDisk.entrypoint, '--project-root', missingFromDisk.dir],
  {
    code: 1,
    stderr:
      /The following entry found in policy were not associated with any Compartment and may be invalid:\n\s+- resources\["undeclared-dep"\]/,
  }
)

test.todo('package only present in policy override')

test.todo('entry module is depended upon by a descendant')

test('--dev processes dev deps', async (t) => {
  t.plan(2)

  const tempdir = await makeTempdir(t)
  try {
    const { code } = await runCLI(
      [
        'run',
        devDeptree.entrypoint,
        '--dev',
        '--policy',
        tempdir.join(`dev-${DEFAULT_POLICY_FILENAME}`),
        '--policy-override',
        tempdir.join(`dev-${DEFAULT_POLICY_OVERRIDE_FILENAME}`),
        '--generate-recklessly',
        '--write',
      ],
      t,
      { cwd: devDeptree.dir }
    )
    t.is(code, undefined)
  } finally {
    await tempdir[Symbol.asyncDispose]()
  }
})

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
