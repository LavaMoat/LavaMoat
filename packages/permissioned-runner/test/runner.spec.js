import test from 'ava'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { prepareFixture } from './utils.js'
import { delimiter, join } from 'node:path'

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

for (const pm of PKGMGR_LIST) {
  test(`runner captures scripts in ${pm}`, async (t) => {
    const cwd = await prepareFixture(t, `runner-${pm}`, pm)

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
    const cwd = await prepareFixture(t, `runner-workspace-${pm}`, pm)
    const nestedCwd = join(cwd, 'packages', 'nested')

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
  const cwd = await prepareFixture(t, 'runner-features', 'npm')

  const result = await execFileAsync('npm', ['test'], {
    cwd,
    env: { ...process.env },
  })
  t.log(result.stdout)

  t.pass()
})
