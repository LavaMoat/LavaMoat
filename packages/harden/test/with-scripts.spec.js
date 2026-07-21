import test from 'ava'
import { hardenDefaults } from '../src/index.js'
import { createFallbackDecisions } from '../src/tools/fallback-decisions.js'
import { createVerifier } from '../src/tools/verifier.js'

import {
  cleanupInstallArtifacts,
  copyProject,
  diffDirs,
  execFileAsync,
  getProjectDir,
  logPrint,
  PKGMGR_LIST,
} from './utils.js'

for (const pm of PKGMGR_LIST) {
  const originalDir = getProjectDir(pm)

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
      // Dependency installation is best-effort here because the fixture may already encode the needed state.
    })

    const { result } = await hardenDefaults({
      cwd,
      packageManager: pm,
      decisions: createFallbackDecisions({ level: 'moderate', print }),
      print,
    })

    cleanupInstallArtifacts(cwd)

    t.snapshot(result, 'changed keys')
    t.snapshot(log, 'log')
    t.snapshot(await diffDirs(originalDir, cwd), 'diff')
  })

  test(`verifier - ${pm} - with scripts - paranoid`, async (t) => {
    const cwd = await copyProject(t, pm)
    const { print, log } = logPrint()

    await execFileAsync(
      pm,
      ['add', '@lavamoat/preinstall-always-fail@3.0.0', '-D'],
      {
        cwd,
      }
    ).catch((_e) => {
      // Dependency installation is best-effort here because the fixture may already encode the needed state.
    })

    const { result } = await hardenDefaults({
      cwd,
      packageManager: pm,
      decisions: createFallbackDecisions({ level: 'paranoid', print }),
      print,
    })

    cleanupInstallArtifacts(cwd)

    t.assert(result.length > 0, 'Expected some changes for paranoid level')

    const decisions = createVerifier({
      level: 'paranoid',
      packageManager: pm,
      print,
    })

    const { summary } = await hardenDefaults({
      cwd,
      packageManager: pm,
      decisions,
      print,
    })

    const { exitCode } = await decisions.showSummary(summary)

    t.log(log)
    t.is(exitCode, 0, 'Expected exit code 0 after verifying changes')
    t.snapshot(log)
  })
}
