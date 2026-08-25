import test from 'ava'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import { copyProject } from './utils.js'
import { hardenDefaults } from '../src/index.js'
import { createFallbackDecisions } from '../src/tools/default-decisions.js'

const execFileAsync = promisify(execFile)

const PKGMGR_LIST = ['npm', 'pnpm', 'yarn']

const runnerSetupPerPm = {
  npm: {
    n_runner: true,
    n_hardenrun: true,
    n_filterenv: true,
    n_engines: false, // explicitly skip baseline
  },
  yarn: {
    y_runner: true,
    y_hardenrun: true,
    y_filterenv: true,
    y_nocache: false,
    y_engines: false, // explicitly skip baseline
  },
  pnpm: {
    p_runner: true,
    p_hardenrun: true,
    p_filterenv: true,
    p_engines: false, // explicitly skip baseline
  },
}

function cleanupPathAfterNpm(PATH) {
  const pathFragments = PATH.split(path.delimiter)
  const filteredFragments = []

  for (const fragment of pathFragments) {
    if (!fragment.includes('node_modules/.bin')) {
      filteredFragments.push(fragment)
    }
  }
  return filteredFragments.join(path.delimiter)
}

for (const pm of PKGMGR_LIST) {
  test(`runner captures scripts in ${pm} after strict setup`, async (t) => {
    const cwd = await copyProject(t, `runner-${pm}`)

    await hardenDefaults({
      cwd,
      packageManager: pm,
      decisions: createFallbackDecisions({
        level: 'baseline',
        print: () => {},
        decisionsSnapshot: runnerSetupPerPm[pm],
      }),
      print: () => {},
    })

    const result = await execFileAsync(pm, ['test'], {
      cwd,
      env: {
        ...process.env,
        TOKEN: 'SECRET',
        BISFOR: 'Bananas',
        PATH: cleanupPathAfterNpm(process.env.PATH),
      },
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
test(`runner wildcard support in scriptsConfig exits zero`, async (t) => {
  t.plan(1)
  const cwd = await copyProject(t, 'runner-features')

  await hardenDefaults({
    cwd,
    packageManager: 'npm',
    decisions: createFallbackDecisions({
      level: 'strict',
      print: () => {},
    }),
    print: () => {},
  })

  const result = await execFileAsync('npm', ['test'], {
    cwd,
    env: { ...process.env },
  })
  t.log(result.stdout)

  t.pass()
})
