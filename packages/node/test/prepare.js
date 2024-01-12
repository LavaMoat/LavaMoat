// @ts-check

/**
 * Prepares test fixture directories for use by the test suite using an
 * arbitrary package manager set via the `LAVAMOAT_PM` env var.
 *
 * @packageDocumentation
 */

'use strict'

const Module = require('node:module')
const path = require('node:path')
const { execFile, spawnSync } = require('node:child_process')
const { promisify } = require('node:util')
const { rm, readdir } = require('node:fs/promises')
const os = require('node:os')

const exec = promisify(execFile)

/**
 * @todo Change this to `npm@latest` when Node.js v16 support is dropped
 */
const LAVAMOAT_PM = process.env.LAVAMOAT_PM ?? 'npm@next-9'
const PROJECTS_DIR = path.join(__dirname, 'projects')

/**
 * Path to `corepack` as installed in the workspace root
 */
const COREPACK_PATH = path.dirname(require.resolve('corepack/package.json'))

/**
 * Path to `corepack` executable from workspace root
 */
const COREPACK_BIN = path.resolve(
  COREPACK_PATH,
  require('corepack/package.json').bin.corepack
)

/**
 * Blast `node_modules` in `cwd`
 *
 * @param {string} cwd - Project dir
 * @returns {Promise<void>}
 */
async function clean(cwd) {
  const nodeModulesPath = path.join(cwd, 'node_modules')
  await rm(nodeModulesPath, { recursive: true, force: true })
}

/**
 * Resolves a module's installation path (_not_ entry point) from some other
 * directory.
 *
 * @param {string} cwd - Some other directory
 * @param {string} moduleId - Module to resolve
 * @returns {string} Resolved dir path
 */
function resolveDependencyFrom(cwd, moduleId) {
  return path.dirname(
    Module.createRequire(path.join(cwd, 'index.js')).resolve(
      `${moduleId}/package.json`
    )
  )
}

/**
 * Some native packages may not ship binaries for Apple silicon, so we have to
 * rebuild them
 *
 * @param {string} cwd
 */
async function rebuild(cwd) {
  const { dependencies } = require(`${cwd}/package.json`)
  const KECCAK = 'keccak'

  // keccak ships no binaries for arm64 darwin
  if (KECCAK in dependencies) {
    console.debug(`Rebuilding ${KECCAK} for ${os.platform()}/${os.arch()}...`)
    const keccakPath = resolveDependencyFrom(cwd, KECCAK)
    spawnSync(COREPACK_BIN, [LAVAMOAT_PM, 'exec', 'node-gyp-build'], {
      cwd: keccakPath,
      stdio: 'inherit',
    })
  }
}

/**
 * Install a project's deps via a package manager, run the `setup` script, then
 * execute `lavamoat` on the `index.js` file.
 *
 * @param {string} cwd - Project dir
 * @returns {Promise<void>}
 */
async function setup(cwd) {
  // assume 'install' is the subcommand on any package manager
  await exec(COREPACK_BIN, [LAVAMOAT_PM, 'install'], { cwd })
  await exec(COREPACK_BIN, [LAVAMOAT_PM, 'run', 'setup'], { cwd })

  await rebuild(cwd)

  await exec(
    process.execPath,
    [require.resolve('../src/cli'), '-a', 'index.js'],
    {
      cwd,
    }
  )
}

async function main() {
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
