/**
 * Custom publishing script which wraps `npm publish` to only attempt publishing
 * packages that have not yet been published.
 *
 * @packageDocumentation
 */

// @ts-check

const { workspaces } = require('../package.json')
const { glob } = require('glob')
const path = require('node:path')
const fs = require('node:fs/promises')
const util = require('node:util')
const exec = util.promisify(require('node:child_process').exec)
const { spawn } = require('node:child_process')

const ROOT = path.join(__dirname, '..')

/**
 * Invoke `npm publish`
 * @param {string[]} pkgs - List of package names to publish
 * @param {boolean} [dryRun] - Whether to publish in dry-run mode
 * @returns {Promise<void>}
 */
async function publish(pkgs, dryRun = true) {
  await new Promise((resolve, reject) => {
    const args = ['publish', ...pkgs.map((name) => `--workspace=${name}`)]
    if (dryRun) {
      args.push('--dry-run')
      console.info('*** DRY RUN *** DRY RUN *** DRY RUN *** DRY RUN ***')
    }

    console.info(`Running \`npm ${args.join(' ')}\``)

    spawn('npm', args, {
      cwd: ROOT,
      stdio: 'inherit',
      shell: true,
    })
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
 * A JSON.parse that doesn't mind a rejected promise
 * @param {Promise<string>} promise
 * @returns {Promise<any>}
 */
const chillJSONParse = async (promise) =>
  promise
    .catch((err) => {
      console.error(err.message)
      return '{}'
    })
    .then(JSON.parse)

/**
 * Inspects all workspaces and publishes any that have not yet been published
 * @returns {Promise<void>}
 */
async function main() {
  // all workspace dirs
  const dirents = await glob(workspaces, { cwd: ROOT, withFileTypes: true, ignore: {
    ignored: p => !p.parent || !p.isDirectory(),
  }, })

  const pkgs = /** @type {string[]} */ (
    (
      await Promise.all(
        dirents.map(
          /**
           * Given a dirent object from `glob`, returns the package name if it
           * hasn't already been published
           */
          async (dirent) => {
            const { name, version, private } = await chillJSONParse(
              fs.readFile(path.join(dirent.fullpath(), 'package.json'), 'utf8')
            )
            if (private || !name) {
              return
            }

            const versions = await chillJSONParse(
              exec(`npm view ${name} versions --json`, {
                cwd: ROOT,
              }).then(({ stdout }) => stdout)
            )
            if (versions.includes(version)) {
              console.info(`Skipping ${name}@${version}; already published`)
              return
            }
            return name
          }
        )
      )
    ).filter(Boolean)
  )
  

  if (pkgs.length === 0) {
    console.info('Nothing to publish')
    return
  }

  console.info(`Publishing ${pkgs.length} package(s): ${pkgs.join(', ')}`)

  await publish(pkgs, true)
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
}
