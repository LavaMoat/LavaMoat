// @ts-check

/**
 * Prepares test fixture directories for use by the test suite using an
 * arbitrary package manager set via the `LAVAMOAT_PM` env var.
 *
 * The default package manager is `npm@latest`.
 *
 * @packageDocumentation
 */

'use strict'

const path = require('node:path')
const { execFile } = require('node:child_process')
const { promisify } = require('node:util')
const { rm, readdir } = require('node:fs/promises')

const exec = promisify(execFile)

const LAVAMOAT_PM = process.env.LAVAMOAT_PM ?? 'npm@latest'
const PROJECTS_DIR = path.join(__dirname, 'projects')

/**
 * Blast `node_modules` in `cwd`
 * @param {string} cwd - Project dir
 * @returns {Promise<void>}
 */
async function clean(cwd) {
  await rm(path.join(cwd, 'node_modules'), { recursive: true, force: true })
}

/**
 * Install a project's deps via a package manager, run the `setup` script, then
 * execute `lavamoat` on the `index.js` file.
 * @param {string} cwd - Project dir
 * @returns {Promise<void>}
 */
async function setup(cwd) {
  // it just so happens that both yarn and npm use the same commands here.
  // this is not guaranteed to always be the case!
  await exec('corepack', [LAVAMOAT_PM, 'install'], { cwd })
  await exec('corepack', [LAVAMOAT_PM, 'run', 'setup'], { cwd })
  await exec('node', [require.resolve('../src/cli'), '-a', 'index.js'], {
    cwd,
  })
}

async function main() {
  if (process.version.startsWith('v14') && LAVAMOAT_PM.startsWith('yarn')) {
    console.error('Skipping Yarn setup for Node.js v14 due to incompatibilities')
    return
  }

  const dirents = await readdir(PROJECTS_DIR, { withFileTypes: true })

  for (const dirent of dirents) {
    if (dirent.isDirectory()) {
      const cwd = path.join(PROJECTS_DIR, dirent.name)
      const relative = path.relative(process.cwd(), cwd)

      await clean(cwd)
      await setup(cwd)

      console.debug('Initialized "%s" using %s', relative, LAVAMOAT_PM)
    }
  }

  console.debug('Test fixtures prepared successfully')
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
}
