import test from 'ava'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import { copyProject } from './utils.js'
import { hardenDefaults } from '../src/index.js'
import { createFallbackDecisions } from '../src/tools/default-decisions.js'

const execFileAsync = promisify(execFile)

const PKGMGR_LIST = ['npm', 'pnpm', 'yarn']

function cleanupPathAfterNpm(PATH) {
  const pathFragments = PATH.split(path.delimiter)
  const filteredFragments = []

  for (const fragment of pathFragments) {
    if (!fragment.includes('node_modules')) {
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
        level: 'strict',
        print: () => {},
        decisionsSnapshot: {
          // one override we need to avoid a more elaborate setup for yarn in this test
          y_allowlist: 'y_meta',
          y_nocache: false,
        },
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
