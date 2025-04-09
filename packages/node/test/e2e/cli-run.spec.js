import '../../src/preamble.js'

import test from 'ava'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createCLIMacros } from './cli-macros.js'

/**
 * Path to the "basic" fixture entry point
 */
const BASIC_FIXTURE_ENTRYPOINT = fileURLToPath(
  new URL('./fixture/basic/app.js', import.meta.url)
)

/**
 * The "basic" fixture's directory
 */
const BASIC_FIXTURE_ENTRYPOINT_DIR = path.dirname(BASIC_FIXTURE_ENTRYPOINT)

const UNTRUSTED_FIXTURE_ENTRYPOINT = 'lard-o-matic'

const UNTRUSTED_FIXTURE_DIR = fileURLToPath(
  new URL('./fixture/extensionless/', import.meta.url)
)

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
  [
    'run',
    BASIC_FIXTURE_ENTRYPOINT,
    '--project-root',
    BASIC_FIXTURE_ENTRYPOINT_DIR,
  ],
  'hello world'
)

test(
  'extra positionals',
  testCLI,
  [
    'run',
    BASIC_FIXTURE_ENTRYPOINT,
    '--project-root',
    BASIC_FIXTURE_ENTRYPOINT_DIR,
    'howdy',
  ],
  { code: 1, stderr: /unknown argument/i }
)

test(
  'extra non-option arguments (positionals)',
  testCLI,
  [
    'run',
    BASIC_FIXTURE_ENTRYPOINT,
    '--project-root',
    BASIC_FIXTURE_ENTRYPOINT_DIR,
    '--',
    'howdy',
  ],
  'howdy world'
)

test(
  'extra non-option arguments (positionals and options)',
  testCLI,
  [
    'run',
    BASIC_FIXTURE_ENTRYPOINT,
    '--project-root',
    BASIC_FIXTURE_ENTRYPOINT_DIR,
    '--',
    'howdy',
    '--yelling',
  ],
  'HOWDY WORLD'
)

test(
  'untrusted entrypoint',
  testCLI,
  [
    'run',
    UNTRUSTED_FIXTURE_ENTRYPOINT,
    '--bin',
    '--project-root',
    UNTRUSTED_FIXTURE_DIR,
  ],
  'scripty test'
)

test.todo('--dev flag')

test.todo('package missing from all package descriptors')

test.todo('package missing from disk')

test.todo('package only present in policy override')

test.todo('entry module is depended upon by a descendant')

// needs impl
test.todo('writing policy.json to disk w/ contents of policy override')
