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
 * Environment variables that could re-enable lifecycle scripts or inject code
 * into the `npm` child process, defeating the protections this module exists to
 * provide. They are stripped from the install subprocess environment.
 *
 * - `npm_config_ignore_scripts` could flip the default if the CLI flag were ever
 *   omitted (the CLI flag wins today, but defense-in-depth).
 * - `NODE_OPTIONS` / `npm_config_node_options` can `--require` arbitrary modules
 *   into the node process that runs `npm`, an arbitrary-code-execution vector.
 * - `npm_config_script_shell` selects the shell used for any script that does
 *   run.
 */
const STRIPPED_ENV_VARS = [
  'npm_config_ignore_scripts',
  'npm_config_node_options',
  'npm_config_script_shell',
  'NODE_OPTIONS',
]

/**
 * Validates a registry URL, rejecting anything that is not `http(s):`.
 *
 * An unvalidated `--registry` value lets an attacker redirect the fetch (e.g.
 * `file://` or a string `npm` interprets specially), defeating the entire
 * fetch-trust chain.
 *
 * @param {string} registry Registry URL
 * @returns {void}
 */
export const assertValidRegistry = (registry) => {
  let url
  try {
    url = new URL(registry)
  } catch {
    throw new InstallError(`Invalid --registry URL: "${registry}"`)
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new InstallError(
      `Invalid --registry URL "${registry}": only http(s) registries are allowed`
    )
  }
}

/**
 * Returns a copy of `env` with variables that could subvert the install
 * removed.
 *
 * @param {NodeJS.ProcessEnv} env Source environment
 * @returns {NodeJS.ProcessEnv}
 */
export const sanitizeNpmEnv = (env) => {
  const out = { ...env }
  for (const key of STRIPPED_ENV_VARS) {
    delete out[key]
  }
  return out
}

/**
 * Builds the argument vector passed to `npm`.
 *
 * The spec is placed last, after a literal `--`, so a spec beginning with `-`
 * can never be interpreted as an `npm` flag (e.g. smuggling in
 * `--ignore-scripts=false` or `--registry=…`).
 *
 * @param {string} spec Package spec to install
 * @param {Omit<InstallOptions, 'cwd' | 'spawn'>} [options] Options
 * @returns {string[]}
 */
export const buildNpmArgs = (
  spec,
  { allowScripts = false, registry, quiet = false } = {}
) => {
  const args = ['install', '--no-audit', '--no-fund']
  if (!allowScripts) {
    args.push('--ignore-scripts')
  }
  if (registry) {
    assertValidRegistry(registry)
    args.push('--registry', registry)
  }
  args.push('--loglevel', quiet ? 'silent' : 'warn')
  args.push('--', spec)
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
      env: sanitizeNpmEnv(process.env),
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
