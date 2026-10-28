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
      readPackageJson: () => ({
        scriptsConfig: { lint: 'lavamoat/scripts.compose.json' },
      }),
    },
    {
      readFileSync: fs.readFileSync,
      existsSync: fs.existsSync,
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
      readPackageJson: () => ({
        scriptsConfig: { lint: 'lavamoat/scripts.cycle.json' },
      }),
    },
    {
      readFileSync: fs.readFileSync,
      existsSync: fs.existsSync,
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

test('bin overrides are prepared once and prepended to PATH', (t) => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'harden-binov-'))
  t.teardown(() => fs.rmSync(projectRoot, { recursive: true, force: true }))
  const overrideDir = path.join(projectRoot, 'node_modules', '.bin_override')

  /** @type {{ dependencies: string[]; overrideDir: string }[]} */
  const calls = []
  const makeWrapper = () =>
    makeRunScriptWrapper(
      {
        projectRoot,
        pathBinMatcher: () => false,
        customizePermissionsConfig: () => {},
        readPackageJson: () => ({
          dependencies: { a: '1' },
          devDependencies: { b: '1' },
        }),
        prepareBinOverrides: (params) => {
          calls.push(params)
          fs.mkdirSync(params.overrideDir)
        },
      },
      {
        readFileSync: fs.readFileSync,
        existsSync: fs.existsSync,
        pathJoin: path.join,
        pathDelimiter: path.delimiter,
        tmpdir: os.tmpdir,
        realpathSync: fs.realpathSync,
        lstatSync: fs.lstatSync,
        readlinkSync: fs.readlinkSync,
      }
    )

  const noNodeModules = makeWrapper().processEnv({ PATH: '/usr/bin' })
  t.is(calls.length, 0, 'skipped when node_modules is missing')
  t.is(noNodeModules.PATH, '/usr/bin')

  fs.mkdirSync(path.join(projectRoot, 'node_modules'))
  const first = makeWrapper().processEnv({ PATH: '/usr/bin' })
  t.deepEqual(calls, [{ dependencies: ['a', 'b'], overrideDir }])
  t.is(first.PATH, [overrideDir, '/usr/bin'].join(path.delimiter))

  const nested = makeWrapper().processEnv({ PATH: first.PATH })
  t.is(calls.length, 1, 'skipped when the dir already exists')
  t.is(nested.PATH, first.PATH, 'not duplicated in nested runs')
})
