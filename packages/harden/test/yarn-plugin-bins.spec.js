import test from 'ava'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { copyProject } from './utils.js'
import { hardenDefaults } from '../src/index.js'
import { createFallbackDecisions } from '../src/tools/default-decisions.js'

const execFileAsync = promisify(execFile)

const runnerSetupPerPm = {
  yarn: {
    y_runner: true,
    y_hardenrun: true,
    y_filterenv: true,
    y_nocache: false,
    y_engines: false, // explicitly skip baseline
  },
}

/** @param {import('ava').ExecutionContext} t */
async function installYarnBinProject(t) {
  t.timeout(180_000)
  const cwd = await copyProject(t, 'runner-yarn-bins')
  const snapshotPath = path.join(cwd, 'lavamoat/bin-snapshot.json')
  const snapshot = await readFile(snapshotPath, 'utf8')
  const env = { ...process.env, PWD: cwd }
  delete env.UPDATE_BIN_SNAPSHOT // just in case of a leftover, it should not be set

  await hardenDefaults({
    cwd,
    packageManager: 'yarn',
    decisions: createFallbackDecisions({
      level: 'baseline',
      print: () => {},
      decisionsSnapshot: runnerSetupPerPm.yarn,
    }),
    print: () => {},
  })

  const result = await execFileAsync('yarn', ['install'], { cwd, env })
  // t.log(result.stdout, result.stderr)
  return { cwd, env, snapshotPath, snapshot, result }
}

test('yarn runner matches the bin snapshot on install', async (t) => {
  const { snapshotPath, snapshot, result } = await installYarnBinProject(t)
  t.notRegex(
    result.stdout + result.stderr,
    /Binary (?:missing in snapshot|mismatch):/
  )
  t.is(await readFile(snapshotPath, 'utf8'), snapshot)
  t.deepEqual(JSON.parse(snapshot), {
    'allow-scripts': 'allow-scripts:npm',
    lavamoat: 'node:npm',
    'lavamoat-sort-policy': 'lavamoat-core:npm',
  })
})

test('yarn runner rejects a local dependency replacing a snapshotted bin', async (t) => {
  const { cwd, env, snapshotPath, snapshot } = await installYarnBinProject(t)
  const localDependency = fileURLToPath(new URL('../../node/', import.meta.url))
  const error = await t.throwsAsync(
    execFileAsync('yarn', ['add', `@lavamoat/node@file:${localDependency}`], {
      cwd,
      env,
    }),
    { code: 1 }
  )
  t.regex(
    error.message,
    /Binary mismatch: lavamoat -> node:file, expected node:npm/
  )
  t.is(await readFile(snapshotPath, 'utf8'), snapshot)
  const manifest = JSON.parse(
    await readFile(path.join(cwd, 'package.json'), 'utf8')
  )
  t.true(manifest.dependencies['@lavamoat/node'].startsWith('file:'))
})

test('yarn runner updates the bin snapshot for a local dependency', async (t) => {
  const { cwd, env, snapshotPath, snapshot } = await installYarnBinProject(t)
  const localDependency = fileURLToPath(new URL('../../node/', import.meta.url))
  await execFileAsync(
    'yarn',
    ['add', `@lavamoat/node@file:${localDependency}`],
    {
      cwd,
      env: { ...env, UPDATE_BIN_SNAPSHOT: '1' },
    }
  )

  const updatedSnapshot = JSON.parse(await readFile(snapshotPath, 'utf8'))
  t.deepEqual(updatedSnapshot, {
    ...JSON.parse(snapshot),
    lavamoat: 'node:file',
  })

  const result = await execFileAsync('yarn', ['install'], { cwd, env })
  t.notRegex(
    result.stdout + result.stderr,
    /Binary (?:missing in snapshot|mismatch):/
  )
  t.deepEqual(JSON.parse(await readFile(snapshotPath, 'utf8')), updatedSnapshot)
})
