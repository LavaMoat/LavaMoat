#! /usr/bin/env node
/// <reference path="../runner/makeRunScriptWrapper.global.d.ts" />

/* global makeRunScriptWrapper */

const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')
const scriptName = process.env.npm_lifecycle_event
const scriptPayload = process.argv[3]

const pkgJsonPath = process.env.npm_package_json

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
const fallbackShell = process.platform === 'win32' ? 'cmd.exe' : '/bin/sh'
const shellArgs = process.platform === 'win32' ? ['/d', '/s', '/c'] : ['-c']

const pathBinMatcherString = `node_modules${path.sep}.bin`

const wrapper = makeRunScriptWrapper(
  {
    scriptName,
    scriptPayload,
    projectRoot: pkgJsonFolder,
    pathBinMatcher: (fragment) => fragment.endsWith(pathBinMatcherString),
    customizePermissionsConfig: addMandatoryReads,
    readScriptsConfig: () => {
      try {
        const pkgData = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'))
        return pkgData.scriptsConfig
      } catch {
        return undefined
      }
    },
  },
  {
    readFileSync: fs.readFileSync,
    pathJoin: path.join,
    pathDelimiter: path.delimiter,
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
 * @param {NodeJS.ProcessEnv} env
 */
function addMandatoryReads(configOptions, env) {
  if (!configOptions['--permission']) {
    return
  }
  if (!configOptions['--allow-fs-read']) {
    configOptions['--allow-fs-read'] = []
  }
  if (Array.isArray(configOptions['--allow-fs-read'])) {
    configOptions['--allow-fs-read'].push(
      // @ts-ignore it has to exist
      env['npm_config_prefix'],
      env['npm_config_userconfig']
    )
  }
}
