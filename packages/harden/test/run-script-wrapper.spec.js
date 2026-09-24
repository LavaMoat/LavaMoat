import test from 'ava'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { getProjectDir } from './utils.js'

const require = createRequire(import.meta.url)
const makeRunScriptWrapper = require('../src/runner/run-script-wrapper.cjs')

test('script config extending provides a sum of options', (t) => {
  const projectRoot = getProjectDir('runner-features')

  let composedNodeOptions
  const wrapper = makeRunScriptWrapper(
    {
      scriptName: 'lint',
      projectRoot,
      pathBinMatcher: () => false,
      customizePermissionsConfig: (config) => {
        composedNodeOptions = config
      },
      readScriptsConfig: () => ({
        lint: 'lavamoat/scripts.compose.json',
      }),
    },
    {
      readFileSync: fs.readFileSync,
      pathJoin: path.join,
      pathDelimiter: path.delimiter,
      tmpdir: os.tmpdir,
      realpathSync: fs.realpathSync,
      lstatSync: fs.lstatSync,
      readlinkSync: fs.readlinkSync,
    }
  )

  const result = wrapper.processEnv({ PATH: process.env.PATH })
  // Useful to understand how a config maps to actual values when tmp
  // gets resolved into fs permissions.
  t.log(result.NODE_OPTIONS)

  t.deepEqual(Object.keys(composedNodeOptions), [
    '--permission',
    '--allow-fs-read',
    '--allow-worker',
    '--allow-fs-write',
  ])
  // allow-fs-tmp creates two items on a mac
  t.assert(composedNodeOptions['--allow-fs-write'].length >= 1)
  t.assert(composedNodeOptions['--allow-fs-read'].length >= 3)
  // ensure additive composition on the read permissions
  t.assert(
    composedNodeOptions['--allow-fs-read'].includes('/'),
    'Expected --allow-fs-read to include /'
  )
  t.assert(
    composedNodeOptions['--allow-fs-read'].includes('./'),
    'Expected --allow-fs-read to include ./'
  )
})

test('script config extending breaks cycles', (t) => {
  const projectRoot = getProjectDir('runner-features')

  const wrapper = makeRunScriptWrapper(
    {
      scriptName: 'lint',
      projectRoot,
      pathBinMatcher: () => false,
      customizePermissionsConfig: (config) => config,
      readScriptsConfig: () => ({
        lint: 'lavamoat/scripts.cycle.json',
      }),
    },
    {
      readFileSync: fs.readFileSync,
      pathJoin: path.join,
      pathDelimiter: path.delimiter,
      tmpdir: os.tmpdir,
      realpathSync: fs.realpathSync,
      lstatSync: fs.lstatSync,
      readlinkSync: fs.readlinkSync,
    }
  )

  t.throws(
    () => {
      wrapper.processEnv({ PATH: process.env.PATH })
    },
    { message: /maximum extend depth exceeded/ }
  )
})
