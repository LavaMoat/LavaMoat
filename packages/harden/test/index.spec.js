/* eslint-disable n/no-unsupported-features/node-builtins */
import test from 'ava'
import { cp, mkdtemp } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { hardenDefaults } from '../src/index.js'
import { createFallbackDecisions } from '../src/tools/fallback-decisions.js'

const execFileAsync = promisify(execFile)

const PROJECTS_DIR = new URL('./projects/', import.meta.url).pathname

/**
 * Copies a fixture project to a temp dir and returns the temp path.
 *
 * @param {string} name - Project folder name (npm, yarn, pnpm)
 */
async function copyProject(name) {
  const tmp = await mkdtemp(join(tmpdir(), `harden-test-${name}-`))
  await cp(join(PROJECTS_DIR, name), tmp, { recursive: true })
  return tmp
}

/**
 * Returns a normalized unified diff between originalDir and modifiedDir. Paths
 * and timestamps are replaced with stable placeholders.
 *
 * @param {string} originalDir
 * @param {string} modifiedDir
 */
async function diffDirs(originalDir, modifiedDir) {
  let stdout = ''
  try {
    ;({ stdout } = await execFileAsync('diff', [
      '-u',
      '-r',
      '-N',
      originalDir,
      modifiedDir,
    ]))
  } catch (err) {
    if (err && typeof err === 'object' && /** @type {any} */ (err).code === 1) {
      stdout = /** @type {any} */ (err).stdout
    } else {
      throw err
    }
  }
  // Strip timestamps from --- / +++ header lines, normalize paths, replace diff command lines with blank separator
  return stdout
    .replaceAll(modifiedDir, '<modified>')
    .replaceAll(originalDir, '<original>')
    .replace(/^(---|\+\+\+) (.+?)\s+\S+\s+\S+\s+\S+$/gm, '$1 $2')
    .replace(/^diff -u -r -N .+$/gm, '\n')
}

for (const pm of ['npm', 'yarn', 'pnpm']) {
  const originalDir = join(PROJECTS_DIR, pm)

  test(`hardenDefaults - ${pm} - moderate level`, async (t) => {
    const cwd = await copyProject(pm)
    const decisions = createFallbackDecisions('moderate')

    const { result } = await hardenDefaults({
      cwd,
      packageManager: pm,
      decisions,
    })

    t.snapshot(result, 'changed keys')
    t.snapshot(await diffDirs(originalDir, cwd), 'diff')
  })

  test(`hardenDefaults - ${pm} - paranoid level`, async (t) => {
    const cwd = await copyProject(pm)
    const decisions = createFallbackDecisions('paranoid')

    const { result } = await hardenDefaults({
      cwd,
      packageManager: pm,
      decisions,
    })

    t.snapshot(result, 'changed keys')
    t.snapshot(await diffDirs(originalDir, cwd), 'diff')
  })

  test(`hardenDefaults - ${pm} - idempotent (paranoid applied twice)`, async (t) => {
    const cwd = await copyProject(pm)
    const decisions = createFallbackDecisions('paranoid')

    await hardenDefaults({ cwd, packageManager: pm, decisions })
    const { result: secondResult } = await hardenDefaults({
      cwd,
      packageManager: pm,
      decisions,
    })

    t.deepEqual(secondResult, [], 'second run should produce no changes')
  })
}
