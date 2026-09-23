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

  const wrapper = makeRunScriptWrapper(
    {
      scriptName: 'lint',
      projectRoot,
      pathBinMatcher: () => false,
      customizePermissionsConfig: (config) => config,
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

  t.snapshot(result.NODE_OPTIONS)
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
