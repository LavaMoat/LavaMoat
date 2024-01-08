const path = require('node:path')
const { INFO, ERR, WARN, OK } = require('./log-symbols')
const { yellow, bold, gray } = require('kleur')
const {
  DEFAULT_SPAWN_OPTS,
  DEFAULT_GLOB_OPTS,
  DEFAULT_CAPS,
  DEFAULT_OPTS,
} = require('./defaults')

/**
 * @param {unknown} arr
 * @returns {arr is string[]}
 */
function isStringArray(arr) {
  return Array.isArray(arr) && arr.every((v) => typeof v === 'string')
}

/**
 * Main class
 */
exports.Laverna = class Laverna {
  /**
   * Initializes options & capabilities
   *
   * @param {import('.').LavernaOptions} [opts]
   * @param {import('.').LavernaCapabilities} [caps]
   */
  constructor(opts = {}, caps = {}) {
    this.opts = { ...DEFAULT_OPTS, ...opts }
    this.caps = { ...DEFAULT_CAPS, ...caps }
    this.getVersions = this.caps.getVersionsFactory
      ? this.caps.getVersionsFactory(this.opts, this.caps)
      : this.defaultGetVersions
    this.invokePublish = this.caps.invokePublishFactory
      ? this.caps.invokePublishFactory(this.opts, this.caps)
      : this.defaultInvokePublish
  }

  /**
   * Make a path relative from root (with leading `.`).
   *
   * Intended for use with logs and exceptions only.
   *
   * @private
   * @param {string} somePath
   * @returns {string}
   */
  relPath(somePath) {
    const fromRoot = path.relative(this.opts.root, somePath)
    return fromRoot ? `.${path.sep}${fromRoot}` : '.'
  }

  /**
   * Invoke `npm publish`
   *
   * @type {import('.').InvokePublish}
   */
  async defaultInvokePublish(pkgs) {
    const { dryRun, root: cwd } = this.opts
    const { spawn, console } = this.caps

    await new Promise((resolve, reject) => {
      const args = ['publish', ...pkgs.map((name) => `--workspace=${name}`)]
      if (dryRun) {
        args.push('--dry-run')
      }

      const relativeCwd = this.relPath(cwd)
      console.error(
        `${INFO} Running command in ${relativeCwd}:\nnpm ${args.join(' ')}`
      )

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
  }

  /**
   * Prompts user to confirm before proceeding
   *
   * @returns {Promise<boolean>}
   */
  async confirm() {
    if (this.opts.yes) {
      throw new Error('Attempted to confirm with yes=true; this is a bug')
    }
    const rl = require('node:readline/promises').createInterface(
      process.stdin,
      process.stderr
    )
    try {
      const answer = await rl.question(`${yellow('Proceed?')} (y/N) `)
      return answer?.toLowerCase() === 'y'
    } finally {
      rl.close()
    }
  }

  /**
   * Default implementation of a {@link GetVersions} function.
   *
   * @type {import('.').GetVersions}
   */
  async defaultGetVersions(name, cwd) {
    const { execFile, parseJson, console } = this.caps
    const { newPkg } = this.opts

    /** @type {string | undefined} */
    let versionContents
    try {
      versionContents = await execFile(
        'npm',
        ['view', name, 'versions', '--json'],
        {
          cwd,
        }
      ).then(({ stdout }) => stdout.trim())
    } catch (e) {
      if (/** @type {NodeJS.ErrnoException} */ (e).code === 'ENOENT') {
        throw new Error(`Could not find npm: ${e}`)
      }
      if (newPkg.includes(name)) {
        console.error(
          `${INFO} Package ${Laverna.pkgToString(name)} confirmed as new`
        )
      } else {
        // it doesn't appear that the type of a rejection from a
        // promisify'd `exec` is surfaced in the node typings
        // anywhere.
        const err = /**
         * @type {import('node:child_process').ExecFileException & {
         *   stdout: string
         * }}
         */ (e)

        // when called with `--json`, you get a JSON error.
        // this could also be handled in a catch() chained to the `exec` promise
        if ('stdout' in err) {
          /**
           * @type {{
           *   error: {
           *     code: string
           *     summary: string
           *     detail: string
           *   }
           * }}
           * @todo See if this type is defined anywhere in npm
           */
          const errJson = parseJson(err.stdout)

          throw new Error(
            `Querying for package ${Laverna.pkgToString(
              name
            )} failed (${errJson.error.summary.trim()}). Missing --newPkg=${name}?`
          )
        }
        throw err
      }
    }

    if (versionContents !== undefined) {
      /** @type {unknown} */
      let json
      try {
        json = parseJson(versionContents)
      } catch (err) {
        console.error(
          `${ERR} Failed to parse output from \`npm view\` for ${Laverna.pkgToString(
            name
          )} as JSON: ${versionContents}`
        )
        throw err
      }

      if (!isStringArray(json)) {
        throw new TypeError(
          `Output from \`npm view\` for ${Laverna.pkgToString(
            name
          )} was not a JSON array of strings: ${versionContents}`
        )
      }

      return json
    }
    return []
  }

  /**
   * Inspects all workspaces and publishes any that have not yet been published
   *
   * @returns {Promise<void>}
   */
  async publishWorkspaces() {
    const { dryRun, root: cwd } = this.opts
    const { fs: _fs, glob, parseJson, console } = this.caps

    if (dryRun) {
      console.error('🚨 DRY RUN 🚨 DRY RUN 🚨 DRY RUN 🚨')
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
    const relativePkgJsonPath = this.relPath(rootPkgJsonPath)

    /** @type {string[] | undefined} */
    let workspaces
    try {
      ;({ workspaces } = parseJson(rootPkgJsonContents.toString('utf-8')))
    } catch (err) {
      console.error(`${ERR} Failed to parse ${relativePkgJsonPath} as JSON`)
      throw err
    }

    if (!workspaces) {
      throw new Error(
        `No "workspaces" prop found in ${relativePkgJsonPath}. This script is intended for use with multi-workspace projects only.`
      )
    }

    if (!isStringArray(workspaces)) {
      throw new Error(
        `"workspaces" prop in ${relativePkgJsonPath} is invalid; must be array of strings`
      )
    }

    /**
     * @type {import('.').GlobDirent[]}
     * @see {@link https://github.com/isaacs/node-glob/issues/551}
     */
    const dirents = await glob(workspaces, {
      ...DEFAULT_GLOB_OPTS,
      cwd,
      fs: _fs,
    })

    if (!dirents.length) {
      throw new Error(
        `"workspaces" pattern in ${relativePkgJsonPath} matched no files/dirs: ${workspaces.join(
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
                 * @type {import('type-fest').PackageJson}
                 */
                let pkg

                /**
                 * `package.json` contents as read from file
                 *
                 * @type {Buffer | string}
                 */
                let pkgJsonContents

                const pkgDir = dirent.fullpath()
                const relativePkgDir = this.relPath(pkgDir)
                const workspacePkgJsonPath = path.join(pkgDir, 'package.json')
                const relativeWorkspacePkgJsonPath =
                  this.relPath(workspacePkgJsonPath)

                try {
                  pkgJsonContents = await fs.readFile(workspacePkgJsonPath)
                } catch (err) {
                  if (
                    /** @type {NodeJS.ErrnoException} */ (err).code === 'ENOENT'
                  ) {
                    console.error(
                      `${WARN} Workspace dir ${relativePkgDir} contains no \`package.json\`. Please move whatever this is somewhere else, or update \`workspaces\` in the workspace root \`package.json\` to exclude this dir; skipping`
                    )
                    return
                  }
                  console.error(
                    `${ERR} Failed to read ${relativeWorkspacePkgJsonPath}`
                  )
                  throw err
                }

                try {
                  pkg = parseJson(pkgJsonContents.toString('utf-8'))
                } catch (err) {
                  console.error(
                    `${ERR} Failed to parse ${relativeWorkspacePkgJsonPath} as JSON`
                  )
                  throw err
                }

                // NOTE TO DEBUGGERS: it's possible, though unlikely, that `pkg`
                // parses into something other than a plain object. if it does
                // happen, the error may be opaque.
                const { private: _private, name, version } = pkg

                // private workspaces should be ignored
                if (_private) {
                  console.error(
                    `${INFO} Skipping private package ${Laverna.pkgToString(
                      name ?? '(unnamed)'
                    )}…`
                  )
                  return
                }

                if (!(name && version)) {
                  throw new Error(
                    `Missing package name and/or version in ${relativeWorkspacePkgJsonPath}; cannot be published`
                  )
                }

                const versions = await this.getVersions(name, cwd)

                if (versions.includes(version)) {
                  console.error(
                    `${INFO} Skipping already-published package ${Laverna.pkgToString(
                      name,
                      version
                    )}…`
                  )
                  return
                }

                return { name, version }
              }
            )
          )
        ).filter(Boolean)
      )
    } catch (err) {
      console.error(
        `${ERR} Workspace analysis failed; no packages have been published.`
      )
      throw err
    }

    if (!pkgs.length) {
      console.error(`${INFO} Nothing to publish`)
      return
    }

    const pkgNames = pkgs.map(({ name }) => name)

    // super unlikely
    const dupes = new Set(
      pkgNames.filter((pkgName, idx) => pkgNames.indexOf(pkgName) !== idx)
    )
    if (dupes.size) {
      throw new Error(
        `Duplicate package name(s) found in workspaces: ${[...dupes]
          .map((dupe) => Laverna.pkgToString(dupe))
          .join(', ')}`
      )
    }

    const nameVersionPairs = pkgs
      .map(({ name, version }) => Laverna.pkgToString(name, version))
      .sort()
    console.error(
      `${INFO} ${yellow(
        `These package(s) will be published:`
      )}\n${nameVersionPairs.join('\n')}`
    )

    if (this.opts.yes || (await this.confirm())) {
      await this.invokePublish(pkgNames)
      console.error(`${OK} Done!`)
    } else {
      console.error(`${ERR} Aborted; no packages haved been published.`)
    }
  }

  /**
   * Format a package name (with optional version) for display
   *
   * @param {string} name
   * @param {string} [version]
   * @returns {string}
   * @internal
   */
  static pkgToString(name, version) {
    return version ? `${bold(name)}${gray('@')}${version}` : bold(name)
  }
}
