import test from 'ava'
import { hardenDefaults } from '../src/index.js'
import { createFallbackDecisions } from '../src/tools/fallback-decisions.js'
import { createVerifier } from '../src/tools/verifier.js'
import {
  copyProject,
  diffDirs,
  getProjectDir,
  logPrint,
  PKGMGR_LIST,
} from './utils.js'

for (const pm of PKGMGR_LIST) {
  const originalDir = getProjectDir(pm)

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

  test(`verifier - ${pm} - moderate level`, async (t) => {
    const cwd = await copyProject(t, pm)
    const { print, log } = logPrint()

    const decisions = createVerifier({
      level: 'moderate',
      packageManager: pm,
      print,
    })

    const { result, summary } = await hardenDefaults({
      cwd,
      packageManager: pm,
      decisions,
      print,
    })

    const { exitCode } = await decisions.showSummary(summary)

    t.deepEqual(result, [], 'Expected no changes to be reported with verifier')
    t.is(exitCode, 1, 'Expected exit code 1 when nothing is applied')
    t.snapshot(log)
  })
}
