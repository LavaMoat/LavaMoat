import { glob } from 'glob'
import childProcess from 'node:child_process'
import Fs from 'node:fs'
import util from 'node:util'

const execFileAsync = util.promisify(childProcess.execFile)

/**
 * Default path to workspace root
 */
export const DEFAULT_ROOT = process.cwd()

/**
 * Default options provided to a {@link SpawnFn}
 */
export const DEFAULT_SPAWN_OPTS = Object.freeze(
  /** @type {import('node:child_process').SpawnOptions} */ ({
    cwd: DEFAULT_ROOT,
    stdio: 'inherit',
    shell: true,
  })
)

/**
 * Default options provided to a {@link GlobFn}
 */
export const DEFAULT_GLOB_OPTS = Object.freeze(
  /** @type {import('glob').GlobOptionsWithFileTypesTrue} */ ({
    cwd: DEFAULT_ROOT,
    withFileTypes: true,
    ignore: {
      ignored: /** @param {import('./types.js').GlobDirent} p */ (p) =>
        !p.parent || !p.isDirectory(),
    },
  })
)

/**
 * Default capabilities for Laverna
 */
export const DEFAULT_CAPS = Object.freeze(
  /** @type {import('./types.js').AllLavernaCapabilities} */ ({
    fs: Fs,
    glob: glob,
    execFile: execFileAsync,
    spawn: childProcess.spawn,
    // eslint-disable-next-line no-restricted-properties
    parseJson: JSON.parse,
    console: globalThis.console,
  })
)

/**
 * Default options for Laverna
 */
export const DEFAULT_OPTS = Object.freeze(
  /** @type {import('./types.js').AllLavernaOptions} */ ({
    dryRun: false,
    yes: false,
    root: DEFAULT_ROOT,
    newPkg: [],
  })
)
