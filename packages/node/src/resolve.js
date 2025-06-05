/**
 * Module resolution utils
 *
 * @packageDocumentation
 */

import nodeFs from 'node:fs'
import Module from 'node:module'
import path from 'node:path'
import { PACKAGE_JSON } from './constants.js'
import { NoBinScriptError, NoWorkspaceError } from './error.js'
import { hrLabel, hrPath } from './format.js'
import { isExecutableSymlink, isReadableFileSync, realpathSync } from './fs.js'
import { log as defaultLog } from './log.js'
import { toPath } from './util.js'

/**
 * @import {ResolveBinScriptOptions, ResolveEntrypointOptions, ResolveWorkspaceOptions} from './internal.js'
 */

export class Resolver {
  /** @type {import('./types.js').Logger} */
  #log
  constructor({ log = defaultLog } = {}) {
    this.#log = log
  }
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
  resolveWorkspace({ from = process.cwd(), fs = nodeFs } = {}) {
  let current = toPath(from)
  // eslint-disable-next-line no-constant-condition
  while (true) {
      const hrCurrentPath = hrPath(current)
      this.#log.debug(`Searching for workspace in ${hrCurrentPath}`)
    if (isReadableFileSync(path.join(current, PACKAGE_JSON), { fs })) {
        this.#log.debug(`Found workspace in ${hrCurrentPath}`)
      return current
    }
    const parent = path.join(current, '..')
    if (parent === current) {
      throw new NoWorkspaceError(
        `Could not find a workspace from ${hrPath(from)}`
      )
    }
    current = parent
  }
}

/**
 * Resolves a specifier to an absolute path, using Node.js module resolution;
 * you can provide a directory or omit a file extension.
 *
   * This works with bare specifiers, though that likely will not be what you
   * want if you're trying to run a bin script.
 *
 * @remarks
   * This function cannot accept an alternative `fs` implementation since there
   * is no way to provide it to {@link Module.createRequire}.
 * @param {string} specifier Absolute path to a resolvable module
 * @param {ResolveEntrypointOptions} [options] Options
 * @returns {string} Resolved path
 */
  resolveEntrypoint(specifier, { from = process.cwd() } = {}) {
  from = toPath(from)
  const abs = path.normalize(path.resolve(from, specifier))
  // the param to `createRequire` should be useless since we're guaranteed an
  // absolute path; this is used to resolve files like `index.js`
  const { resolve } = Module.createRequire(import.meta.url)
    const entrypoint = resolve(abs)
    this.#log.debug(
      `Resolved entrypoint ${hrPath(abs)} to ${hrPath(entrypoint)}`
    )
    return entrypoint
}

/**
 * Resolve a path to an executable ("bin" script) in the closest
 * `node_modules/.bin/` dir.
 *
 * @remarks
 * This is not recursive due to the potential for stack overflows (though
 * unlikely). TODO: refactor to be async
 * @param {string} name Bin script name
 * @param {ResolveBinScriptOptions} [options]
 * @returns {string} Path to the bin script
 */
  resolveBinScript(name, { from = process.cwd(), fs = nodeFs } = {}) {
  from = toPath(from)
  /** @type {string} */
  let workspace
    const hrFrom = hrPath(from)
    const hrBin = hrLabel(name)
  try {
      workspace = this.resolveWorkspace({ from, fs })
  } catch {
    throw new NoWorkspaceError(
        `Could not find a workspace from ${hrFrom}; are in your project directory?`
    )
  }
  let current = workspace
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const maybeBinDir = path.join(current, 'node_modules', '.bin')
      const hrBinDir = hrPath(maybeBinDir)
      this.#log.debug(`Searching for ${hrBin} in ${hrBinDir}`)
    const maybeBinPath = path.join(maybeBinDir, name)
    if (isExecutableSymlink(maybeBinPath, { fs })) {
      const realBinPath = realpathSync(maybeBinPath, { fs })
        const hrRealBinPath = hrPath(realBinPath)
        this.#log.debug(
          `Found executable ${hrBin} in ${hrBinDir} linked from ${hrRealBinPath}`
      )
      return realBinPath
    }

    /** @type {string} */
    let next
    try {
        next = this.resolveWorkspace({ from: path.join(current, '..'), fs })
    } catch {
      throw new NoBinScriptError(
          `Could not find executable ${hrBin} from ${hrFrom}`
      )
    }
    if (next === current) {
        this.#log.debug(`Reached filesystem root; stopping search`)
      throw new NoBinScriptError(
          `Could not find executable ${hrBin} from ${hrFrom}`
      )
    }
      this.#log.debug(`No such executable ${hrBin} in ${hrBinDir}; continuing…`)
    current = next
    }
  }
}
