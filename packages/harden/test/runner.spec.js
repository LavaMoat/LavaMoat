import test from 'ava'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { copyProject } from './utils.js'
import { delimiter } from 'node:path'
import { hardenDefaults } from '../src/index.js'
import { createFallbackDecisions } from '../src/tools/default-decisions.js'

const execFileAsync = promisify(execFile)

const PKGMGR_LIST = ['npm', 'pnpm', 'yarn']

function cleanupPathAfterNpm(PATH) {
  const pathFragments = PATH.split(delimiter)
  const filteredFragments = []
  for (const fragment of pathFragments) {
    if (!fragment.includes('node_modules')) {
      filteredFragments.push(fragment)
    }
  }
  return filteredFragments.join(delimiter)
}

const runnerSetupPerPm = {
  npm: {
    n_runner: true,
    n_hardenrun: true,
  },
  yarn: {
    y_runner: true,
    y_hardenrun: true,
    y_nocache: false,
  },
  pnpm: {
    p_runner: true,
    p_hardenrun: true,
  },
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
        decisionsSnapshot: runnerSetupPerPm[pm],
      }),
      print: () => {},
    })

    if (pm !== 'yarn') {
      // force installing local runner
      await execFileAsync(
        pm,
        ['install', '-D', './@lavamoat/permissioned-runner'],
        {
          cwd,
          env: {
            PATH: cleanupPathAfterNpm(process.env.PATH),
          },
        }
      )
    }

    const result = await execFileAsync(pm, ['test'], {
      cwd,
      env: {
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
