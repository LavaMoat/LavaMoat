/**
 * Module resolution utils
 *
 * @packageDocumentation
 */

import nodeFs from 'node:fs'
import Module from 'node:module'
import path from 'node:path'
import { isExecutableSymlink, isReadableFileSync, realpathSync } from './fs.js'
import { log } from './log.js'

/**
 * @import {ResolveBinScriptOptions, ResolveWorkspaceOptions} from './internal.js'
 */

/**
 * Resolves a workspace directory from the given directory.
 *
 * A workspace is defined as a directory containing a `package.json`, which we
 * assume means that a `node_modules/` could be a sibling.
 *
 * @remarks
 * This is not recursive due to the potential for stack overflows (though
 * unlikely).
 * @param {ResolveWorkspaceOptions} options Options
 * @returns {string} Path to workspace directory
 */
export const resolveWorkspace = ({
  from = process.cwd(),
  fs = nodeFs,
} = {}) => {
  let current = from
  // eslint-disable-next-line no-constant-condition
  while (true) {
    log.debug(`Searching for workspace in ${current}`)
    if (isReadableFileSync(path.join(current, 'package.json'), { fs })) {
      log.debug(`Found workspace in ${current}`)
      return current
    }
    const parent = path.join(current, '..')
    if (parent === current) {
      throw new Error(`Could not find a workspace from ${from}`)
    }
    current = parent
  }
}

/**
 * Resolves a specifier to an absolute path, using Node.js module resolution;
 * you can provide a directory or omit a file extension.
 *
 * This works with bare specifiers, though that likely will not be what you want
 * if you're trying to run a bin script.
 *
 * @remarks
 * This function cannot accept an alternative `fs` implementation since there is
 * no way to provide it to {@link Module.createRequire}.
 * @param {string} specifier Absolute path to a resolvable module
 * @param {string} [from] Directory to resolve from
 * @returns {string} Resolved path
 */
export const resolveEntrypoint = (specifier, from = process.cwd()) => {
  const abs = path.normalize(path.resolve(from, specifier))
  // the param to `createRequire` should be useless since we're guaranteed an
  // absolute path; this is used to resolve files like `index.js`
  const { resolve } = Module.createRequire(import.meta.url)
  return resolve(abs)
}

/**
 * Resolve a path to a bin script in the closest `node_modules/.bin/` dir.
 *
 * @remarks
 * This is not recursive due to the potential for stack overflows (though
 * unlikely).
 * @param {string} name Bin script name
 * @param {ResolveBinScriptOptions} [options]
 * @returns {string} Path to the bin script
 */
export const resolveBinScript = (
  name,
  { from = process.cwd(), fs = nodeFs } = {}
) => {
  /** @type {string} */
  let workspace
  try {
    workspace = resolveWorkspace({ from, fs })
  } catch {
    throw new Error(
      `Could not find a workspace from ${from} while resolving bin script for ${name}`
    )
  }
  let current = workspace
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const maybeBinDir = path.join(current, 'node_modules', '.bin')
    log.debug(`Searching for ${name} in ${maybeBinDir}`)
    const maybeBinPath = path.join(maybeBinDir, name)
    if (isExecutableSymlink(maybeBinPath, { fs })) {
      const realBinPath = realpathSync(maybeBinPath, { fs })
      log.debug(`Found bin script ${name} in ${maybeBinPath} => ${realBinPath}`)
      return maybeBinPath
    }
    log.debug(`No such bin script ${name} in ${maybeBinDir}`)
    try {
      const next = resolveWorkspace({ from: path.join(current, '..'), fs })
      if (next === current) {
        throw new Error(
          `Could not find a workspace from ${from} while resolving bin script for ${name}`
        )
      }
      current = next
    } catch {
      throw new Error(
        `Could not find a workspace from ${from} while resolving bin script for ${name}`
      )
    }
  }
}
