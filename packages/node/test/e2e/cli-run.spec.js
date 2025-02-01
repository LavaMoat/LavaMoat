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
  ['run', BASIC_FIXTURE_ENTRYPOINT, '--root', BASIC_FIXTURE_ENTRYPOINT_DIR],
  'hello world'
)

test(
  'extra positionals',
  testCLI,
  [
    'run',
    BASIC_FIXTURE_ENTRYPOINT,
    '--root',
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
    '--root',
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
    '--root',
    BASIC_FIXTURE_ENTRYPOINT_DIR,
    '--',
    'howdy',
    '--yelling',
  ],
  'HOWDY WORLD'
)
