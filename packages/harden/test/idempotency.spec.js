import test from 'ava'
import { hardenDefaults } from '../src/index.js'
import { createFallbackDecisions } from '../src/tools/fallback-decisions.js'
import { copyProject, logPrint, PKGMGR_LIST } from './utils.js'

for (const pm of PKGMGR_LIST) {
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
}
