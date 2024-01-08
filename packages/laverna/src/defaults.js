const Glob = require('glob')
const childProcess = require('node:child_process')
const Fs = require('node:fs')
const util = require('node:util')
const execFileAsync = util.promisify(childProcess.execFile)

/**
 * Default path to workspace root
 */
const DEFAULT_ROOT = process.cwd()
exports.DEFAULT_ROOT = DEFAULT_ROOT

/**
 * Default options provided to a {@link SpawnFn}
 */
const DEFAULT_SPAWN_OPTS = Object.freeze(
  /** @type {import('node:child_process').SpawnOptions} */ ({
    cwd: DEFAULT_ROOT,
    stdio: 'inherit',
    shell: true,
  })
)
exports.DEFAULT_SPAWN_OPTS = DEFAULT_SPAWN_OPTS

/**
 * Default options provided to a {@link GlobFn}
 */
const DEFAULT_GLOB_OPTS = Object.freeze(
  /** @type {import('glob').GlobOptionsWithFileTypesTrue} */ ({
    cwd: DEFAULT_ROOT,
    withFileTypes: true,
    ignore: {
      ignored: /** @param {import('.').GlobDirent} p */ (p) =>
        !p.parent || !p.isDirectory(),
    },
  })
)
exports.DEFAULT_GLOB_OPTS = DEFAULT_GLOB_OPTS

/**
 * Default capabilities for Laverna
 */
const DEFAULT_CAPS = Object.freeze(
  /** @type {import('.').AllLavernaCapabilities} */ ({
    fs: Fs,
    glob: Glob.glob,
    execFile: execFileAsync,
    spawn: childProcess.spawn,
    // eslint-disable-next-line no-restricted-properties
    parseJson: JSON.parse,
    console: globalThis.console,
  })
)
exports.DEFAULT_CAPS = DEFAULT_CAPS

/**
 * Default options for Laverna
 */
const DEFAULT_OPTS = Object.freeze(
  /** @type {import('.').AllLavernaOptions} */ ({
    dryRun: false,
    yes: false,
    root: DEFAULT_ROOT,
    newPkg: [],
  })
)
exports.DEFAULT_OPTS = DEFAULT_OPTS
