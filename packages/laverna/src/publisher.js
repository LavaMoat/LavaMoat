/**
 * Publisher implementations for npm and Yarn Berry workspaces.
 *
 * Each publisher knows how to invoke its package manager's publish command. Use
 * {@link createPublisher} to detect the correct one automatically.
 *
 * @packageDocumentation
 */

/**
 * @import {Publisher, AllLavernaOptions, AllLavernaCapabilities, PublishFn, PublisherFactory} from './types'
 */

const path = require('node:path')
const { INFO } = require('./log-symbols')
const { DEFAULT_SPAWN_OPTS } = require('./defaults')

/**
 * Computes a display-friendly relative path from `root`.
 *
 * @param {string} root
 * @param {string} somePath
 * @returns {string}
 */
function relPath(root, somePath) {
  const fromRoot = path.relative(root, somePath)
  return fromRoot ? `.${path.sep}${fromRoot}` : '.'
}

/**
 * Publishes workspace packages via `npm publish --workspace=...`.
 *
 * This is the default publisher used when no `yarn.lock` is detected.
 *
 * @implements {Publisher}
 */
class NpmPublisher {
  /** @type {'npm'} */
  name = 'npm'

  /**
   * @param {AllLavernaOptions} opts
   * @param {Pick<AllLavernaCapabilities, 'spawn' | 'console'>} caps
   */
  constructor(opts, caps) {
    this.opts = opts
    this.caps = caps
  }

  /** @type {PublishFn} */
  async publish(pkgs) {
    const { dryRun, root: cwd } = this.opts
    const { spawn, console } = this.caps

    await new Promise((resolve, reject) => {
      const args = ['publish', ...pkgs.map((name) => `--workspace=${name}`)]
      if (dryRun) {
        args.push('--dry-run')
      }

      const relativeCwd = relPath(cwd, cwd)
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
}

/**
 * Publishes workspace packages via `yarn workspaces foreach ... npm publish`.
 *
 * Yarn Berry resolves `workspace:` protocol specifiers (e.g. `workspace:^`)
 * in-memory during packing, so no on-disk `package.json` rewriting is needed.
 *
 * The `--include` flag selects specific workspaces by package name.
 * `--no-private` is belt-and-suspenders (laverna already filters private
 * packages). `--tolerate-republish` prevents errors if a version was already
 * published (laverna already filters these too, but just in case).
 *
 * @implements {Publisher}
 */
class YarnPublisher {
  /** @type {'yarn'} */
  name = 'yarn'

  /**
   * @param {AllLavernaOptions} opts
   * @param {Pick<AllLavernaCapabilities, 'spawn' | 'console'>} caps
   */
  constructor(opts, caps) {
    this.opts = opts
    this.caps = caps
  }

  /** @type {PublishFn} */
  async publish(pkgs) {
    const { dryRun, root: cwd } = this.opts
    const { spawn, console } = this.caps

    await new Promise((resolve, reject) => {
      const args = [
        'workspaces',
        'foreach',
        '-A',
        '--no-private',
        ...pkgs.flatMap((name) => ['--include', name]),
        'npm',
        'publish',
        '--tolerate-republish',
      ]
      if (dryRun) {
        args.push('--dry-run')
      }

      const relativeCwd = relPath(cwd, cwd)
      console.error(
        `${INFO} Running command in ${relativeCwd}:\nyarn ${args.join(' ')}`
      )

      spawn('yarn', args, { ...DEFAULT_SPAWN_OPTS, cwd })
        .once('error', reject)
        .once('exit', (code) => {
          if (code === 0) {
            resolve(void 0)
          } else {
            reject(
              new Error(
                `yarn workspaces foreach npm publish exited with code ${code}`
              )
            )
          }
        })
    })
  }
}

/**
 * Detects the package manager and creates the appropriate {@link Publisher}.
 *
 * Checks for `yarn.lock` in the workspace root. If present, returns a
 * {@link YarnPublisher}; otherwise returns an {@link NpmPublisher}.
 *
 * @type {PublisherFactory}
 */
async function createPublisher(opts, caps) {
  const yarnLockPath = path.resolve(opts.root, 'yarn.lock')
  try {
    await caps.fs.promises.lstat(yarnLockPath)
    return new YarnPublisher(opts, caps)
  } catch {
    return new NpmPublisher(opts, caps)
  }
}

module.exports = { createPublisher }
