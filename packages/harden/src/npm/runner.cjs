#! /usr/bin/env node
/// <reference path="../runner/make-run-script-wrapper.global.d.ts" />

/* global makeRunScriptWrapper */

const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')
const { tmpdir } = require('node:os')
const scriptName = process.env.npm_lifecycle_event
const scriptPayload = process.argv[3]

const pkgJsonPath = process.env.npm_package_json
const globalPrefix = process.env['npm_config_global_prefix']
// the bin dir of the npm running this script, e.g. <prefix>/lib/node_modules/npm/bin
const npmBinDir =
  process.env.npm_execpath && path.dirname(process.env.npm_execpath)

/**
 * Bin names pinned via node_modules/.bin_override - see
 * runner-bin-confusion.md. `global` is a path to link to, `local` is a direct
 * dependency whose bin to link to, skipped if not installed.
 *
 * @type {Record<string, { global?: string; local?: string }>}
 */
const binOpinions = {
  node: { global: process.execPath },
  npm: { global: npmBinDir && path.join(npmBinDir, 'npm-cli.js') },
  npx: { global: npmBinDir && path.join(npmBinDir, 'npx-cli.js') },
  // set by npm and pnpm to their bundled node-gyp, resolved by the package manager itself
  'node-gyp': { global: process.env.npm_config_node_gyp },
  tsc: { local: 'typescript' },
  lerna: { local: 'lerna' },
  parcel: { local: 'parcel' },
  webpack: { local: 'webpack' },
}

if (!pkgJsonPath) {
  throw Error(
    `[LavaMoat] FATAL: 'npm_package_json' environment variable is missing. A modern package manager is required.`
  )
}

if (!scriptName) {
  console.error(
    `[LavaMoat] Warning: 'npm_lifecycle_event' environment variable is missing.`
  )
}

const pkgJsonFolder = path.dirname(pkgJsonPath)

// There's no reasonable way to pass a node script as a shell in windows
// (along with other problems) and using WSL is probably a better approach for
// Windows users anyway.
const fallbackShell = '/bin/sh'
const shellArgs = ['-c']

const pathBinMatcherString = `node_modules${path.sep}.bin`

/** @type {(fragment: string) => boolean} */
let pathBinMatcher

if (globalPrefix) {
  // keep globally installed packages path in the same relative position with others in case
  pathBinMatcher = (fragment) =>
    fragment.endsWith(pathBinMatcherString) || fragment.startsWith(globalPrefix)
} else {
  pathBinMatcher = (fragment) => fragment.endsWith(pathBinMatcherString)
}

const wrapper = makeRunScriptWrapper(
  {
    scriptName,
    scriptPayload,
    projectRoot: pkgJsonFolder,
    pathBinMatcher: pathBinMatcher,
    customizePermissionsConfig: addMandatoryReads,
    readPackageJson: () => {
      try {
        return JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'))
      } catch {
        return undefined
      }
    },
    prepareBinOverrides,
  },
  {
    readFileSync: fs.readFileSync,
    existsSync: fs.existsSync,
    pathJoin: path.join,
    pathDelimiter: path.delimiter,
    tmpdir,
    realpathSync: fs.realpathSync,
    lstatSync: fs.lstatSync,
    readlinkSync: fs.readlinkSync,
  }
)

const customEnv = wrapper.processEnv(process.env)

// Note: spawnSync is used here instead of process.execve because execve is
// not available on Windows. Leaving this here to switch to execve in case other reasons to
// drop Windows support arise.
// process.execve(fallbackShell, [...shellArgs, scriptPayload], customEnv)

const result = spawnSync(fallbackShell, [...shellArgs, scriptPayload], {
  stdio: 'inherit',
  env: customEnv,
  cwd: pkgJsonFolder,
})
if (result.error) {
  console.error(
    `[LavaMoat wrapper failed to execute "${scriptName}"] ${result.error.message}`
  )
}
if (result && 'status' in result) {
  process.exit(result.status)
} else {
  process.exit(1)
}

/**
 * @param {Record<string, boolean | string | string[]>} configOptions
 * @param {NodeJS.ProcessEnv} _env
 */
function addMandatoryReads(configOptions, _env) {
  if (!configOptions['--permission']) {
    return
  }
  if (!configOptions['--allow-fs-read']) {
    configOptions['--allow-fs-read'] = []
  }
  if (Array.isArray(configOptions['--allow-fs-read'])) {
    configOptions['--allow-fs-read'].push(
      '$npm_config_prefix',
      '$npm_config_userconfig'
    )
  }
}

/** @type {NonNullable<MakeRunScriptWrapperOptions['prepareBinOverrides']>} */
function prepareBinOverrides({ dependencies, overrideDir }) {
  const nodeModules = path.dirname(overrideDir)
  // Populate a temp dir and rename it, so a concurrent run never sees a partial result.
  const tmpDir = fs.mkdtempSync(`${overrideDir}-`)
  try {
    for (const [binName, { global, local }] of Object.entries(binOpinions)) {
      const target = local
        ? dependencies.includes(local) &&
          localBin(path.join(nodeModules, local), binName)
        : global
      if (target && fs.existsSync(target)) {
        fs.symlinkSync(target, path.join(tmpDir, binName))
      }
    }
    fs.renameSync(tmpDir, overrideDir)
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
}

/**
 * @param {string} pkgDir
 * @param {string} binName
 * @returns {string | undefined}
 */
function localBin(pkgDir, binName) {
  try {
    const { name, bin } = JSON.parse(
      fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8')
    )
    const binPath =
      typeof bin === 'string' ? name === binName && bin : bin?.[binName]
    return binPath ? path.join(pkgDir, binPath) : undefined
  } catch {
    return undefined
  }
}
