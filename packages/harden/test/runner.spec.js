import test from 'ava'
import { cp, mkdtemp } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { hardenDefaults } from '../src/index.js'
import { createFallbackDecisions } from '../src/tools/fallback-decisions.js'

const execFileAsync = promisify(execFile)

const DEBUG = false

const PKGMGR_LIST = ['npm', 'pnpm', 'yarn']
const PROJECTS_DIR = new URL('./projects/', import.meta.url).pathname

/**
 * Copies a fixture project to a temp dir and returns the temp path.
 *
 * @param {string} name - Project folder name
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

for (const pm of PKGMGR_LIST) {
  test(`.runner.cjs captures scripts in ${pm} after paranoid setup`, async (t) => {
    const cwd = await copyProject(t, `runner-${pm}`)

    await hardenDefaults({
      cwd,
      packageManager: pm,
      decisions: createFallbackDecisions({
        level: 'paranoid',
        print: () => {},
      }),
      print: () => {},
    })

    if (pm === 'yarn') {
      // call yarn install in the temp dir to ensure .runner.cjs is used
      await execFileAsync(pm, ['install'], {
        cwd,
      })
    }

    const result = await execFileAsync(pm, ['test'], {
      cwd,
      env: { ...process.env, TOKEN: 'SECRET', BISFOR: 'Bananas' },
    })
    t.log(result.stderr)
    t.regex(result.stdout, /^Absolutely$/gm, 'Expected output not found')
    t.regex(result.stdout, /^Bananas$/gm, 'Expected output not found')
    t.notRegex(
      result.stdout,
      /SECRET/gm,
      'Expected no secret leakage, but SECRET is present'
    )
  })
}
