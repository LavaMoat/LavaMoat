import test from 'ava'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { getProjectDir } from './utils.js'

const require = createRequire(import.meta.url)
const makeRunScriptWrapper = require('../src/runner/run-script-wrapper.cjs')

const WRAPPER_IO = {
  readFileSync: fs.readFileSync,
  existsSync: fs.existsSync,
  pathJoin: path.join,
  pathDelimiter: path.delimiter,
  tmpdir: os.tmpdir,
  realpathSync: fs.realpathSync,
  lstatSync: fs.lstatSync,
  readlinkSync: fs.readlinkSync,
}

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
    WRAPPER_IO
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
    WRAPPER_IO
  )

  t.throws(
    () => {
      wrapper.processEnv({ PATH: process.env.PATH })
    },
    { message: /maximum extend depth exceeded/ }
  )
})

test('unsupported Node options are omitted while supported options are preserved', (t) => {
  const projectRoot = getProjectDir('runner-features')
  const configPath = path.join(projectRoot, 'options.json')
  const banPath = path.join(projectRoot, 'lavamoat', '.env.ban.json')
  const wrapper = makeRunScriptWrapper(
    {
      scriptName: 'lint',
      projectRoot,
      pathBinMatcher: () => false,
      customizePermissionsConfig: () => {},
      readPackageJson: () => ({
        scriptsConfig: { lint: 'options.json' },
      }),
    },
    {
      ...WRAPPER_IO,
      readFileSync: (filePath) => {
        if (filePath === configPath) {
          return JSON.stringify({
            nodeOptions: {
              '--trace-warnings': true,
              '--require': ['first', 'second'],
              '--max-old-space-size': '1024',
              '--no-warnings': false,
              '--nonexistent-boolean-option': true,
              '--nonexistent-array-option': ['value'],
              '--nonexistent-string-option': 'value',
            },
          })
        }
        if (filePath === banPath) {
          return '[]'
        }
        throw new Error(`Unexpected file: ${filePath}`)
      },
    }
  )

  const result = wrapper.processEnv({ PATH: process.env.PATH })
  t.is(
    result.NODE_OPTIONS,
    '--trace-warnings --require="first" --require="second" --max-old-space-size="1024"'
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
      WRAPPER_IO
    )

  const noNodeModules = makeWrapper().processEnv({ PATH: '/usr/bin' })
  t.is(calls.length, 0, 'skipped when node_modules is missing')
  t.is(
    noNodeModules.PATH,
    '/usr/bin',
    'PATH remains unchanged when node_modules is missing'
  )

  fs.mkdirSync(path.join(projectRoot, 'node_modules'))
  const first = makeWrapper().processEnv({ PATH: '/usr/bin' })
  t.deepEqual(
    calls,
    [{ dependencies: ['a', 'b'], overrideDir }],
    'prepareBinOverrides called with correct params'
  )
  t.is(
    first.PATH,
    [overrideDir, '/usr/bin'].join(path.delimiter),
    'overrideDir is added to PATH'
  )

  const nested = makeWrapper().processEnv({ PATH: first.PATH })
  t.is(calls.length, 1, 'skipped when the dir already exists')
  t.is(nested.PATH, first.PATH, 'not duplicated in nested runs')
})
