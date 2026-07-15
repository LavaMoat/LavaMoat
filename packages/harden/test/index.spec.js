/* eslint-disable n/no-unsupported-features/node-builtins */
import test from 'ava'
import { cp, mkdtemp, readdir } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { hardenDefaults } from '../src/index.js'
import { createFallbackDecisions } from '../src/tools/fallback-decisions.js'
import { rmSync } from 'node:fs'

const execFileAsync = promisify(execFile)

const DEBUG = false

const PKGMGR_LIST = ['npm', 'yarn', 'pnpm']
const PROJECTS_DIR = new URL('./projects/', import.meta.url).pathname

/**
 * Copies a fixture project to a temp dir and returns the temp path.
 *
 * @param {string} name - Project folder name (npm, yarn, pnpm)
 */
async function copyProject(t, name) {
  if (DEBUG) {
    return join(PROJECTS_DIR, name)
  }
  const tmp = await mkdtemp(join(tmpdir(), `harden-test-${name}-`))
  await cp(join(PROJECTS_DIR, name), tmp, { recursive: true })
  t.log(`--- setting up test in ${tmp}`)
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
  let stdout
  try {
    ;({ stdout } = await execFileAsync('diff', [
      '-u',
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

  // List files in modified dir
  const files = await readdir(modifiedDir, {
    recursive: true,
    withFileTypes: true,
  })
  const fileList = files
    .filter((f) => f.isFile())
    .map((f) =>
      f.parentPath
        ? f.parentPath.slice(modifiedDir.length + 1) + '/' + f.name
        : f.name
    )
    .filter((p) => !p.startsWith('node_modules/'))
    .sort()
    .join('\n')

  // Strip timestamps from --- / +++ header lines, normalize paths, replace diff command lines with blank separator
  const diff = (stdout ?? '')
    .replaceAll(modifiedDir, '<modified>')
    .replaceAll(originalDir, '<original>')
    .replace(/^(---|\+\+\+) (.+?)\s+\S+\s+\S+\s+\S+$/gm, '$1 $2')
    .replace(/^\s*diff -u -N .+$/gm, '\n')

  return `--- files ---\n${fileList}\n--- diff ---\n${diff}`
}

function logPrint() {
  const log = []
  return {
    forget: () => {},
    print: (...args) => {
      log.push(args.join(' '))
    },
    log,
  }
}

for (const pm of PKGMGR_LIST) {
  const originalDir = join(PROJECTS_DIR, pm)

  test(`hardenDefaults - ${pm} - moderate level`, async (t) => {
    const cwd = await copyProject(t, pm)
    const { print, log } = logPrint()

    const { result } = await hardenDefaults({
      cwd,
      packageManager: pm,
      decisions: createFallbackDecisions({ level: 'moderate', print }),
      print,
    })

    t.snapshot(result, 'changed keys')
    t.snapshot(log, 'log')
    t.snapshot(await diffDirs(originalDir, cwd), 'diff')
  })

  test(`hardenDefaults - ${pm} - paranoid level`, async (t) => {
    const cwd = await copyProject(t, pm)
    const { print, log } = logPrint()

    const { result } = await hardenDefaults({
      cwd,
      packageManager: pm,
      decisions: createFallbackDecisions({ level: 'paranoid', print }),
      print,
    })

    t.snapshot(result, 'changed keys')
    t.snapshot(log, 'log')
    t.snapshot(await diffDirs(originalDir, cwd), 'diff')
  })

  test(`hardenDefaults - ${pm} - idempotent (paranoid applied twice)`, async (t) => {
    const cwd = await copyProject(t, pm)
    const { print, log, forget } = logPrint()

    await hardenDefaults({
      cwd,
      packageManager: pm,
      decisions: createFallbackDecisions({ level: 'paranoid', print: forget }),
      print: forget,
    })
    const { result } = await hardenDefaults({
      cwd,
      packageManager: pm,
      decisions: createFallbackDecisions({ level: 'paranoid', print }),
      print,
    })

    t.snapshot(log, 'log')
    t.deepEqual(result, [], 'second run should produce no changes')
  })
  test(`hardenDefaults - ${pm} - with scripts - moderate`, async (t) => {
    const cwd = await copyProject(t, pm)
    const { print, log } = logPrint()

    await execFileAsync(
      pm,
      ['add', '@lavamoat/preinstall-always-fail@3.0.0', '-D'],
      {
        cwd,
      }
    ).catch((_e) => {
      // t.log(`> ${pm} add\n`, _e.stdout, _e.stderr)
    })

    const { result } = await hardenDefaults({
      cwd,
      packageManager: pm,
      decisions: createFallbackDecisions({ level: 'moderate', print }),
      print,
    })

    rmSync(join(cwd, 'pnpm-lock.yaml'), { force: true }) // ignore changes to lockfile which are not relevant to this test
    rmSync(join(cwd, 'yarn.lock'), { force: true }) // ignore changes to lockfile which are not relevant to this test
    rmSync(join(cwd, '.pnp.cjs'), { force: true }) // ignore install artifact
    rmSync(join(cwd, 'package-lock.json'), { force: true }) // ignore changes to lockfile which are not relevant to this test

    t.snapshot(result, 'changed keys')
    t.snapshot(log, 'log')
    t.snapshot(await diffDirs(originalDir, cwd), 'diff')
  })
}
