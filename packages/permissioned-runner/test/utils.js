import { execFile } from 'node:child_process'
import { cp, mkdir, mkdtemp, symlink, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import { bundleYarnPlugin } from '../src/index.js'

export const execFileAsync = promisify(execFile)

const PROJECTS_DIR = fileURLToPath(new URL('./projects/', import.meta.url))
const RUNNER_BIN = fileURLToPath(
  new URL('../src/npm-runner.js', import.meta.url)
)

// npm scripts inherit PATH; node_modules/.bin ancestors of the test-runner
// process can shadow the fixture's own bin. Strip them so the fixture-local
// symlink is what gets found.
export function cleanupPathAfterNpm(PATH) {
  return PATH.split(':')
    .filter((fragment) => !fragment.includes('node_modules'))
    .join(':')
}

/**
 * Copies a fixture project to a temp dir.
 *
 * @param {import('ava').ExecutionContext<unknown>} t
 * @param {string} name
 * @returns {Promise<string>}
 */
export async function copyProject(t, name) {
  const dest = await mkdtemp(join(tmpdir(), `permissioned-runner-${name}-`))
  await cp(join(PROJECTS_DIR, name), dest, { recursive: true })
  t.log(`--- setting up test in ${dest}`)
  return dest
}

/**
 * Makes the runner available inside a fixture:
 *
 * - For npm/pnpm: creates `node_modules/.bin/lavamoat-permissioned-runner`
 *   pointing at the package's bin.
 * - For yarn: writes the bundled plugin at `lavamoat/.runner-plugin.js`.
 *
 * @param {string} cwd
 * @param {'npm' | 'pnpm' | 'yarn'} pm
 */
export async function setupRunner(cwd, pm) {
  if (pm === 'yarn') {
    await mkdir(join(cwd, 'lavamoat'), { recursive: true })
    await writeFile(join(cwd, 'lavamoat/.runner-plugin.js'), bundleYarnPlugin())
    return
  } else {
    const binDir = join(cwd, 'node_modules', '.bin')
    await mkdir(binDir, { recursive: true })
    const linkPath = join(binDir, 'lavamoat-permissioned-runner')
    await rm(linkPath, { force: true })
    await symlink(RUNNER_BIN, linkPath)
  }
}

export async function prepareFixture(t, name, pm) {
  const cwd = await copyProject(t, name)
  await setupRunner(cwd, pm)
  return cwd
}
