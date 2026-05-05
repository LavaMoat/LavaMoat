import '../../src/preamble.js'

import test from 'ava'
import { readJsonFile } from '../../src/fs.js'
import { createCLIMacros } from './cli-macros.js'

/**
 * @import {PackageJson} from 'type-fest'
 */

const { testCLI } = createCLIMacros(test)

test(
  '"--help" prints help',
  testCLI,
  ['--help'],
  async (t, { code, stdout }) => {
    t.plan(2)
    t.is(code, undefined)
    t.true(stdout.length > 0)
  }
)

test(
  '"--version" matches package descriptor',
  testCLI,
  ['--version'],
  async (t, { stdout }) => {
    const { version } = /** @type {PackageJson} */ (
      await readJsonFile(new URL('../../package.json', import.meta.url))
    )
    t.is(stdout, `${version}`)
  }
)
