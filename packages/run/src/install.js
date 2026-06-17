/**
 * Installs a single package into a sandbox directory using `npm`, with
 * lifecycle (install) scripts disabled by default.
 *
 * Disabling install scripts is the same protection provided by
 * `@lavamoat/allow-scripts`, and it neutralizes the single biggest attack
 * vector of `npx`: arbitrary `preinstall`/`install`/`postinstall` code running
 * the instant a package is fetched.
 *
 * **All exports in this module are considered part of the public API.**
 *
 * @packageDocumentation
 */

import { spawn as defaultSpawn } from 'node:child_process'
import { InstallError } from './error.js'

/**
 * @import {InstallOptions} from './types.js'
 */

/**
 * The `npm` executable name for the current platform.
 */
const NPM_BIN = process.platform === 'win32' ? 'npm.cmd' : 'npm'

/**
 * Builds the argument vector passed to `npm`.
 *
 * @param {string} spec Package spec to install
 * @param {Omit<InstallOptions, 'cwd' | 'spawn'>} [options] Options
 * @returns {string[]}
 */
export const buildNpmArgs = (
  spec,
  { allowScripts = false, registry, quiet = false } = {}
) => {
  const args = ['install', spec, '--no-audit', '--no-fund']
  if (!allowScripts) {
    args.push('--ignore-scripts')
  }
  if (registry) {
    args.push('--registry', registry)
  }
  args.push('--loglevel', quiet ? 'silent' : 'warn')
  return args
}

/**
 * Installs `spec` into the sandbox directory `cwd`.
 *
 * The sandbox directory is expected to already contain a `package.json`.
 *
 * @param {string} spec Package spec to install
 * @param {InstallOptions} options Options
 * @returns {Promise<void>}
 */
export const installPackage = async (
  spec,
  { cwd, allowScripts = false, registry, quiet = false, spawn = defaultSpawn }
) => {
  const args = buildNpmArgs(spec, { allowScripts, registry, quiet })

  await new Promise((resolve, reject) => {
    const child = spawn(NPM_BIN, args, {
      cwd,
      stdio: quiet ? ['ignore', 'ignore', 'inherit'] : 'inherit',
      shell: false,
    })
    child.on('error', (err) => {
      reject(
        new InstallError(
          `Failed to spawn "${NPM_BIN}"; is npm installed and on your PATH?`,
          { cause: err }
        )
      )
    })
    child.on('close', (code) => {
      if (code === 0) {
        resolve(undefined)
      } else {
        reject(
          new InstallError(
            `Installation of "${spec}" failed: npm exited with code ${code}`
          )
        )
      }
    })
  })
}
