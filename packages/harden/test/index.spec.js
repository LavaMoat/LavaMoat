/* eslint-disable ava/assertion-arguments */
import test from 'ava'
import { cp, readFile, mkdtemp } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { hardenDefaults } from '../src/index.js'
import { createFallbackDecisions } from '../src/tools/fallback-decisions.js'

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
 * Reads a file relative to cwd, returns null if it doesn't exist.
 *
 * @param {string} cwd
 * @param {string} file
 */
async function readOutput(cwd, file) {
  try {
    return await readFile(join(cwd, file), 'utf8')
  } catch {
    return null
  }
}

for (const [pm, configFile] of [
  ['npm', '.npmrc'],
  ['yarn', '.yarnrc.yml'],
  ['pnpm', 'pnpm-workspace.yaml'],
]) {
  test(`hardenDefaults - ${pm} - moderate level`, async (t) => {
    const cwd = await copyProject(pm)
    const decisions = createFallbackDecisions('moderate')

    const { result } = await hardenDefaults({
      cwd,
      packageManager: pm,
      decisions,
    })

    t.snapshot(result, 'changed keys')
    t.snapshot(await readOutput(cwd, configFile), configFile)
    t.snapshot(await readOutput(cwd, 'package.json'), 'package.json')
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
    t.snapshot(await readOutput(cwd, configFile), configFile)
    t.snapshot(await readOutput(cwd, 'package.json'), 'package.json')
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
