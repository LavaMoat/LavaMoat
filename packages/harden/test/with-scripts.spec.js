import test from 'ava'
import { hardenDefaults } from '../src/index.js'
import { createFallbackDecisions } from '../src/tools/fallback-decisions.js'
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
}
