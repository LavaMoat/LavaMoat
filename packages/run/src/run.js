/**
 * Orchestration: fetch a package (scripts disabled) and execute its bin under
 * `@lavamoat/node` with a generated, enforced per-package SES policy.
 *
 * Importing this module imports `@lavamoat/node`, which calls SES `lockdown()`.
 * This is intentional: the entire purpose of `@lavamoat/run` is to execute
 * untrusted code inside a hardened environment.
 *
 * **All exports in this module are considered part of the public API.**
 *
 * @packageDocumentation
 */

import {
  generatePolicy as defaultGeneratePolicy,
  run as defaultRun,
} from '@lavamoat/node'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  INSTALL_MARKER_FILENAME,
  PACKAGE_JSON,
  POLICY_RELATIVE_PATH,
  SANDBOX_PACKAGE_NAME,
  TRUST_ROOT,
} from './constants.js'
import { pathExists, readJsonFile } from './fs.js'
import { installPackage } from './install.js'
import { log } from './log.js'
import { getInstalledPackageName, resolveBin } from './resolve-bin.js'
import { cacheDirFor, computeCacheBase, parseSpec } from './spec.js'

/**
 * @import {LavaxOptions} from './types.js'
 */

/**
 * Ensures the sandbox directory exists and contains a minimal `package.json`.
 *
 * @param {string} sandboxDir Sandbox directory
 * @returns {Promise<string>} Path to the sandbox `package.json`
 */
const ensureSandbox = async (sandboxDir) => {
  await mkdir(sandboxDir, { recursive: true })
  const pkgPath = path.join(sandboxDir, PACKAGE_JSON)
  if (!(await pathExists(pkgPath))) {
    await writeFile(
      pkgPath,
      `${JSON.stringify(
        { name: SANDBOX_PACKAGE_NAME, version: '0.0.0', private: true },
        null,
        2
      )}\n`
    )
  }
  return pkgPath
}

/**
 * Returns `true` if `sandboxDir` already contains an install of `raw`.
 *
 * @param {string} sandboxDir Sandbox directory
 * @param {string} raw Raw spec
 * @returns {Promise<boolean>}
 */
const isInstalled = async (sandboxDir, raw) => {
  const markerPath = path.join(sandboxDir, INSTALL_MARKER_FILENAME)
  if (!(await pathExists(markerPath))) {
    return false
  }
  try {
    const contents = await readJsonFile(markerPath)
    return contents === raw
  } catch {
    return false
  }
}

/**
 * Securely fetches and runs a package's bin script.
 *
 * 1. Parses the spec and computes an isolated sandbox directory.
 * 2. Installs the package with lifecycle scripts disabled (unless `allowScripts`).
 * 3. Resolves the bin script to execute.
 * 4. Generates (and caches) a LavaMoat policy on first use; reuses it after.
 * 5. Executes the bin via `@lavamoat/node` as an untrusted root, enforcing the
 *    policy.
 *
 * @template [T=unknown] Exports of the executed module. Default is `unknown`
 * @param {string} rawSpec Package spec (e.g. `cowsay`, `cowsay@1.5.0`,
 *   `@scope/pkg@^2`)
 * @param {string[]} [forwardedArgs] Arguments forwarded to the bin script
 * @param {LavaxOptions} [options] Options
 * @returns {Promise<T>} Exports of the executed bin module
 */
export const lavax = async (rawSpec, forwardedArgs = [], options = {}) => {
  const {
    call,
    regenerate = false,
    force = false,
    allowScripts = false,
    prodOnly = true,
    registry,
    cacheDir,
    policyPath: explicitPolicyPath,
    quiet = false,
    install = installPackage,
    run = defaultRun,
    generatePolicy = defaultGeneratePolicy,
  } = options

  const parsed = parseSpec(rawSpec)
  const base = computeCacheBase({ cacheDir })
  const sandboxDir = cacheDirFor(parsed.raw, base)

  await ensureSandbox(sandboxDir)

  if (force || !(await isInstalled(sandboxDir, parsed.raw))) {
    if (allowScripts) {
      log.warning(
        `⚠ Lifecycle (install) scripts are ENABLED for "${parsed.raw}". This disables a core LavaMoat protection; only do this for packages you trust.`
      )
    }
    if (force) {
      await rm(path.join(sandboxDir, 'node_modules'), {
        recursive: true,
        force: true,
      })
    }
    log.info(
      `Installing "${parsed.raw}" (lifecycle scripts ${allowScripts ? 'enabled' : 'disabled'})…`
    )
    await install(parsed.raw, {
      cwd: sandboxDir,
      allowScripts,
      registry,
      quiet,
    })
    await writeFile(
      path.join(sandboxDir, INSTALL_MARKER_FILENAME),
      JSON.stringify(parsed.raw)
    )
  } else {
    log.info(`Using cached install of "${parsed.raw}"`)
  }

  const packageName = await getInstalledPackageName(sandboxDir, {
    hint: parsed.name,
  })
  const { binName, binPath } = await resolveBin(sandboxDir, packageName, {
    call,
  })
  log.info(`Running "${binName}" from "${packageName}" under LavaMoat`)

  const policyPath =
    explicitPolicyPath ?? path.join(sandboxDir, ...POLICY_RELATIVE_PATH)

  /** @type {import('@lavamoat/types').LavaMoatPolicy | undefined} */
  let policy
  const policyExists = await pathExists(policyPath)
  if (regenerate || !policyExists) {
    log.info(
      `${policyExists ? 'Regenerating' : 'Generating'} LavaMoat policy for "${packageName}"…`
    )
    policy = await generatePolicy(binPath, {
      policyPath,
      projectRoot: sandboxDir,
      write: true,
      prodOnly,
      trustRoot: TRUST_ROOT,
    })
  } else {
    log.info(`Using cached policy at ${policyPath}`)
  }

  // Present `process.argv` to the executed bin as if it were run directly with
  // `node`. Mutate in place to be safe under `lockdown()`.
  process.argv.length = 0
  process.argv.push(process.execPath, binPath, ...forwardedArgs)

  return /** @type {Promise<T>} */ (
    run(binPath, {
      policy,
      policyPath,
      projectRoot: sandboxDir,
      prodOnly,
      trustRoot: TRUST_ROOT,
    })
  )
}
