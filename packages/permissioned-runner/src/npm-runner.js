#! /usr/bin/env node

import { spawnSync } from 'node:child_process'
import { readFileSync, realpathSync, existsSync } from 'node:fs'
import { delimiter, dirname, join, sep } from 'node:path'
import { tmpdir } from 'node:os'

import makeRunScriptWrapper from './run-script-wrapper.js'

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

// if dirname(pkgJsonPath) contains lavamoat dir, use it. Otherwise, use __dirname and split off the node_modules.*
const workspaceRoot = existsSync(join(dirname(pkgJsonPath), 'lavamoat'))
  ? dirname(pkgJsonPath) // no workspaces setup or running script in the top-level
  : import.meta.dirname.split(`${sep}node_modules${sep}`)[0] // fallback for when running a script in a workspace dir

const pkgJsonFolder = dirname(pkgJsonPath)
const fallbackShell = process.platform === 'win32' ? 'cmd.exe' : '/bin/sh'
const shellArgs = process.platform === 'win32' ? ['/d', '/s', '/c'] : ['-c']

const pathBinMatcherString = `node_modules${sep}.bin`

const wrapper = makeRunScriptWrapper(
  {
    scriptName,
    scriptPayload,
    projectRoot: workspaceRoot,
    pathBinMatcher: (fragment) => fragment.endsWith(pathBinMatcherString),
    customizePermissionsConfig: addMandatoryReads,
    readScriptsConfig: () => {
      try {
        const pkgData = JSON.parse(readFileSync(pkgJsonPath, 'utf8'))
        return pkgData.scriptsConfig
      } catch {
        return undefined
      }
    },
  },
  {
    readFileSync,
    pathJoin: join,
    pathDelimiter: delimiter,
    tmpdir,
    realpathSync,
  }
)

const customEnv = wrapper.processEnv(process.env)

// process.execve would be better here, but it is unavailable on Windows
const result = spawnSync(fallbackShell, [...shellArgs, scriptPayload], {
  stdio: 'inherit',
  env: customEnv,
  cwd: pkgJsonFolder, // should this be process.cwd? Outcomes are generally better when the script runs with package.json location as cwd even if invoked from a nested folder in my experience.
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
