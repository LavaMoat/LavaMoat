#!/usr/bin/env node
/* eslint-disable n/shebang */
// @ts-check

/**
 * Custom publishing script which wraps `npm publish` to only attempt publishing
 * packages that have not yet been published.
 *
 * @packageDocumentation
 */

const Glob = require('glob')
const path = require('node:path')
const Fs = require('node:fs')
const util = require('node:util')
const childProcess = require('node:child_process')

/**
 * Default path to workspace root
 */
const DEFAULT_ROOT = path.join(__dirname, '..')

/**
 * Default options provided to a {@link GlobFn}
 */
const DEFAULT_GLOB_OPTS = /** @type {const} */ ({
  cwd: DEFAULT_ROOT,
  withFileTypes: true,
  ignore: {
    ignored: /** @param {GlobDirent} p */ (p) => !p.parent || !p.isDirectory(),
  },
})

/**
 * Default options provided to a {@link SpawnFn}
 */
const DEFAULT_SPAWN_OPTS = /** @type {const} */ ({
  cwd: DEFAULT_ROOT,
  stdio: 'inherit',
  shell: true,
})

/**
 * `Dirent`-like object returned by `glob`; adds a `fullpath()` method and
 * `parent` prop
 *
 * @defaultValue `Path` from `path-scurry`, which is resolved by `glob()` if the
 * @typedef {import('fs').Dirent & {
 *   fullpath: () => string
 *   parent?: GlobDirent
 * }} GlobDirent
 */

/**
 * Function used to spawn `npm publish`.
 *
 * Returned `EventEmitter` _must_ emit `exit` and _may_ emit `error`.
 *
 * @defaultValue `childProcess.spawn`
 * @typedef {(
 *   cmd: string,
 *   args: string[],
 *   opts: typeof DEFAULT_SPAWN_OPTS
 * ) => import('events').EventEmitter} SpawnFn
 */

/**
 * Function used to execute commands and retrieve the `stdout` and `stderr` from
 * execution.
 *
 * @typedef {(
 *   cmd: string,
 *   opts: { cwd: string }
 * ) => Promise<{ stdout: string; stderr: string }>} ExecFn
 */

/**
 * Globbing function.
 *
 * Pretty tightly-bound to `glob`, unfortunately.
 *
 * @defaultValue `Glob.glob`
 * @typedef {(
 *   pattern: string | string[],
 *   opts: typeof DEFAULT_GLOB_OPTS
 * ) => Promise<GlobDirent[]>} GlobFn
 */

/**
 * Function used to parse a JSON string
 *
 * @defaultValue `JSON.parse`
 * @typedef {(json: string) => any} ParseJsonFn
 */

/**
 * Loosey-gooesy `fs.promises` implementation
 *
 * @typedef {{
 *   [K in keyof Pick<
 *     typeof Fs.promises,
 *     'lstat' | 'readdir' | 'readlink' | 'realpath' | 'readFile'
 *   >]: (...args: any[]) => Promise<any>
 * }} MinimalFsPromises
 */

/**
 * Bare minimum `fs` implementation for our purposes
 *
 * @typedef MinimalFs
 * @property {MinimalFsPromises} promises
 */

/**
 * Options for {@link publishWorkspaces}
 *
 * @typedef PublishWorkspacesOptions
 * @property {boolean} [dryRun] - Whether to publish in dry-run mode
 * @property {MinimalFs} [fs] - Bare minimum `fs` implementation
 * @property {GlobFn} [glob] - Function to glob for files
 * @property {ExecFn} [exec] - Function to execute a command
 * @property {SpawnFn} [spawn] - Function to spawn a process
 * @property {ParseJsonFn} [parseJson] - Function to parse JSON
 * @property {Console} [console] - Console to use for logging
 * @property {string} [root] - Workspace root
 * @property {string[]} [newPkg] - New packages to publish
 */

/**
 * Minimal `package.json` definition.
 *
 * @typedef PackageJson
 * @property {boolean} [private]
 * @property {string} name
 * @property {string} version
 * @todo If we ever pull in `type-fest` for whatever reason, use its
 *   `PackageJson` instead.
 */

/**
 * Namespace-like object with methods for publishing packages
 */
const Publish = {
  /**
   * Invoke `npm publish`
   *
   * @param {string[]} pkgs - List of package names to publish
   * @param {object} opts
   * @param {boolean} [opts.dryRun] - Whether to publish in dry-run mode
   * @param {SpawnFn} [opts.spawn] - Spawner function
   * @param {Console} [opts.console] - Console
   * @param {string} [opts.root] - Workspace root
   * @returns {Promise<void>}
   */
  async invokeNpmPublish(
    pkgs,
    {
      dryRun = false,
      spawn = childProcess.spawn,
      console = globalThis.console,
      root: cwd = DEFAULT_ROOT,
    } = {}
  ) {
    await new Promise((resolve, reject) => {
      const args = [
        'publish',
        '--access=public',
        ...pkgs.map((name) => `--workspace=${name}`),
      ]
      if (dryRun) {
        args.push('--dry-run')
      }

      console.info(`Running \`npm ${args.join(' ')}\``)

      spawn('npm', args, { ...DEFAULT_SPAWN_OPTS, cwd })
        .once('error', reject)
        .once('exit', (code) => {
          if (code === 0) {
            resolve(void 0)
          } else {
            reject(new Error(`npm publish exited with code ${code}`))
          }
        })
    })
  },

  /**
   * Inspects all workspaces and publishes any that have not yet been published
   *
   * @param {PublishWorkspacesOptions} opts - Options
   * @returns {Promise<void>}
   */
  async publishWorkspaces({
    dryRun = false,
    fs: _fs = Fs,
    glob = Glob.glob,
    exec = util.promisify(childProcess.exec),
    spawn = childProcess.spawn,
    parseJson = JSON.parse,
    console = globalThis.console,
    root: cwd = DEFAULT_ROOT,
    newPkg: newPkgs = [],
  } = {}) {
    if (dryRun) {
      console.info('*** DRY RUN *** DRY RUN *** DRY RUN *** DRY RUN ***')
    }

    const { promises: fs } = _fs

    /** @type {string | Buffer} */
    let rootPkgJsonContents
    const rootPkgJsonPath = path.resolve(cwd, 'package.json')
    try {
      rootPkgJsonContents = await fs.readFile(rootPkgJsonPath)
    } catch (err) {
      throw new Error(
        `Could not read package.json in workspace root ${cwd}: ${err}`
      )
    }

    /** @type {string[] | undefined} */
    let workspaces
    try {
      ;({ workspaces } = parseJson(rootPkgJsonContents.toString('utf-8')))
    } catch (err) {
      console.error(`Failed to parse ${rootPkgJsonPath} as JSON`)
      throw err
    }

    if (!workspaces) {
      throw new Error(
        `No "workspaces" prop found in ${rootPkgJsonPath}; you don't need this script!`
      )
    }

    /**
     * @type {GlobDirent[]}
     * @see {@link https://github.com/isaacs/node-glob/issues/551}
     */
    let dirents
    try {
      dirents = await glob(workspaces, { ...DEFAULT_GLOB_OPTS, cwd, fs: _fs })
    } catch (err) {
      console.error(`glob failed to discover workspace folders`)
      throw err
    }

    if (!dirents.length) {
      throw new Error(
        `"workspaces" pattern in ${rootPkgJsonPath} matched no files/dirs: ${workspaces.join(
          ', '
        )}`
      )
    }

    /** @type {{ name: string; version: string }[]} */
    let pkgs

    try {
      pkgs = /** @type {{ name: string; version: string }[]} */ (
        (
          await Promise.all(
            dirents.map(
              /**
               * Given a dirent object from `glob`, returns the package name if
               * it hasn't already been published
               */
              async (dirent) => {
                /**
                 * Parsed contents of `package.json` for the package in the dir
                 * represented by `dirent`
                 *
                 * @type {PackageJson}
                 */
                let pkg

                /**
                 * `package.json` contents as read from file
                 *
                 * @type {Buffer | string}
                 */
                let pkgJsonContents

                const pkgDir = dirent.fullpath()
                const pkgJsonPath = path.join(pkgDir, 'package.json')
                try {
                  pkgJsonContents = await fs.readFile(pkgJsonPath)
                } catch (err) {
                  if (err.code === 'ENOENT') {
                    console.warn(
                      `Workspace dir ${pkgDir} contains no \`package.json\`. Please move whatever this is somewhere else, or update \`workspaces\` in the workspace root \`package.json\` to exclude this dir; skipping`
                    )
                    return
                  }
                  console.error(`Failed to read ${pkgJsonPath}`)
                  throw err
                }

                try {
                  pkg = parseJson(pkgJsonContents.toString('utf-8'))
                } catch (err) {
                  console.error(`Failed to parse ${pkgJsonPath} as JSON`)
                  throw err
                }

                // NOTE TO DEBUGGERS: it's possible, though unlikely, that `pkg`
                // parses into something other than a plain object. if it does
                // happen, the error may be opaque.
                const { private, name, version } = pkg

                // private workspaces should be ignored
                if (private) {
                  console.info(`Skipping workspace ${name}; private package`)
                  return
                }

                if (!(name && version)) {
                  throw new Error(
                    `Missing package name and/or version in ${pkgJsonPath}; cannot be published`
                  )
                }

                /**
                 * Raw STDOUT of `npm view <name> versions --json`
                 *
                 * @type {string | undefined}
                 */
                let versionContents
                try {
                  versionContents = await exec(
                    `npm view ${name} versions --json`,
                    { cwd }
                  ).then(({ stdout }) => stdout)
                } catch (err) {
                  if (newPkgs.includes(name)) {
                    console.info(`Package ${name} confirmed as new`)
                  } else {
                    // when called with `--json`, you get a JSON error.
                    // this could also be handled in a catch() chained to the `exec` promise
                    if ('stdout' in err) {
                      /** @type {{
  error: {
    code: string
    summary: string
    detail: string
  }
}} */
                      let errJson
                      try {
                        errJson = parseJson(err.stdout)
                      } catch {
                        throw err
                      }
                      throw new Error(
                        `Querying npm for package ${name} failed: ${errJson.error.summary} ${errJson.error.detail}`
                      )
                    }
                    throw err
                  }
                }

                if (versionContents !== undefined) {
                  /**
                   * List of published versions for this pkg
                   *
                   * @type {string[]}
                   */
                  let versions
                  try {
                    versions = parseJson(versionContents)
                  } catch (err) {
                    console.error(
                      `Failed to parse output from \`npm view\` for ${name} as JSON`
                    )
                    throw err
                  }

                  // ANOTHER NOTE TO DEBUGGERS: we are assuming the parsed JSON
                  // result is a `string[]`. if it isn't, this `includes()` call may
                  // fail
                  if (versions.includes(version)) {
                    console.info(
                      `Skipping ${name}@${version}; already published`
                    )
                    return
                  }
                }

                return { name, version }
              }
            )
          )
        ).filter(Boolean)
      )
    } catch (err) {
      console.error('Workspace analysis failed; refusing to publish')
      throw err
    }

    if (!pkgs.length) {
      console.info('Nothing to publish')
      return
    }

    const pkgNames = pkgs.map(({ name }) => name)

    // super unlikely
    const dupes = new Set(
      pkgNames.filter((pkgName, idx) => pkgNames.indexOf(pkgName) !== idx)
    )
    if (dupes.size) {
      throw new Error(
        `Duplicate package name(s) found in workspaces: ${[...dupes].join(
          ', '
        )}`
      )
    }

    const nameVersionPairs = pkgs
      .map(({ name, version }) => `${name}@${version}`)
      .sort()
    console.info(
      `Publishing ${pkgs.length} package(s): ${nameVersionPairs.join(', ')}`
    )

    await Publish.invokeNpmPublish(pkgNames, { dryRun, spawn, console })
  },

  /**
   * Parses CLI args for script
   *
   * @param {string[]} [args]
   */
  parseArgs(args) {
    const { values } = util.parseArgs({
      args,
      options: {
        dryRun: {
          type: 'boolean',
        },
        root: {
          type: 'string',
          default: DEFAULT_ROOT,
        },
        help: {
          type: 'boolean',
        },
        newPkg: {
          type: 'string',
          multiple: true,
        },
      },
    })
    return values
  },
}

if (require.main === module) {
  let opts = Publish.parseArgs()

  if (opts.help) {
    console.error(`
${process.argv[1]} [--dry-run] [--root=<path>]

Publishes all workspaces to the npm registry, as needed

  --dryRun       - Run "npm publish" in dry-run mode
  --root=<path>   - Path to workspace root
  --newPkg=<name> - Workspace <name> is new and should be published; can be specified multiple times`)
  } else {
    Publish.publishWorkspaces(opts).catch((err) => {
      console.error(err)
      process.exitCode = 1
    })
  }
}

module.exports = Publish
