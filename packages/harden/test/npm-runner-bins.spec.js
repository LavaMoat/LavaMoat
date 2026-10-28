import test from 'ava'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { chmod, mkdir, readdir, readlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { copyProject } from './utils.js'
import { hardenDefaults } from '../src/index.js'
import { createFallbackDecisions } from '../src/tools/default-decisions.js'

const execFileAsync = promisify(execFile)

/**
 * @param {string} file
 * @param {string} output
 */
async function writeBin(file, output) {
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, `#!/bin/sh\necho ${output}\n`)
  await chmod(file, 0o755)
}

test('npm runner pins known bins via node_modules/.bin_override', async (t) => {
  const cwd = await copyProject(t, 'runner-npm-bins')
  const nodeModules = path.join(cwd, 'node_modules')
  // the direct dependency providing tsc
  await writeBin(path.join(nodeModules, 'typescript/bin/tsc'), 'real-tsc')
  await writeFile(
    path.join(nodeModules, 'typescript/package.json'),
    JSON.stringify({ name: 'typescript', bin: { tsc: 'bin/tsc' } })
  )
  // a transitive dependency attempting bin confusion
  for (const bin of ['tsc', 'npm', 'lerna', 'node-gyp']) {
    await writeBin(path.join(nodeModules, '.bin', bin), `fake-${bin}`)
  }

  await hardenDefaults({
    cwd,
    packageManager: 'npm',
    decisions: createFallbackDecisions({
      level: 'baseline',
      print: () => {},
      decisionsSnapshot: { n_runner: true, n_engines: false },
    }),
    print: () => {},
  })

  const { stdout } = await execFileAsync('npm', ['run', '-s', 'bins'], {
    cwd,
    env: {
      ...process.env,
      PWD: cwd,
      PATH: (process.env.PATH ?? '')
        .split(path.delimiter)
        .filter((fragment) => !fragment.includes('node_modules'))
        .join(path.delimiter),
    },
  })
  const overrideDir = path.join(nodeModules, '.bin_override')
  const [tsc, npm, lerna, nodeGyp, nestedPath] = stdout.trim().split('\n')
  t.is(tsc, 'real-tsc')
  t.is(npm, path.join(overrideDir, 'npm'))
  // no opinion applied - lerna is not a direct dependency
  t.is(lerna, path.join(nodeModules, '.bin', 'lerna'))
  t.not(nodeGyp, path.join(nodeModules, '.bin', 'node-gyp'))
  t.is(
    nestedPath.split(path.delimiter).filter((p) => p === overrideDir).length,
    1,
    'overrideDir is not duplicated in nested runs'
  )

  const links = await readdir(overrideDir)
  t.deepEqual(links.sort(), ['node', 'node-gyp', 'npm', 'npx', 'tsc'])
  t.regex(
    await readlink(path.join(overrideDir, 'node-gyp')),
    /node-gyp[/\\]bin[/\\]node-gyp\.js$/
  )
  t.is(
    await readlink(path.join(overrideDir, 'tsc')),
    path.join(nodeModules, 'typescript/bin/tsc')
  )
  t.regex(await readlink(path.join(overrideDir, 'node')), /node$/)
  t.regex(await readlink(path.join(overrideDir, 'npm')), /npm-cli\.js$/)
})
