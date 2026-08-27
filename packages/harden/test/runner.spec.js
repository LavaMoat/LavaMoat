import test from 'ava'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { copyProject } from './utils.js'
import { delimiter, join } from 'node:path'
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

  test(`runner loads default config in root and nested workspace package for ${pm}`, async (t) => {
    const cwd = await copyProject(t, `runner-workspace-${pm}`)
    const nestedCwd = join(cwd, 'packages', 'nested')

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

    // pnm install
    await execFileAsync(pm, ['install'], {
      cwd,
      env: { PATH: cleanupPathAfterNpm(process.env.PATH) },
    })

    const rootResult = await execFileAsync(pm, ['run', 'root-default'], {
      cwd,
      env: {
        PATH: cleanupPathAfterNpm(process.env.PATH),
      },
    })

    const nestedResult = await execFileAsync(pm, ['run', 'nested-default'], {
      cwd: nestedCwd,
      env: {
        PATH: cleanupPathAfterNpm(process.env.PATH),
      },
    })

    t.regex(
      rootResult.stdout,
      /^ROOT_DEFAULT:lavamoat\/scripts\.loose\.json$/gm,
      'Expected root package to load default scripts config'
    )
    t.regex(
      nestedResult.stdout,
      /^NESTED_DEFAULT:lavamoat\/scripts\.loose\.json$/gm,
      'Expected nested workspace package to load default scripts config'
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
