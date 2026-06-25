import test from 'ava'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { readJsonFile } from '../../src/fs.js'

/**
 * @import {PackageJson} from 'type-fest'
 */

const execFileAsync = promisify(execFile)

const CLI_PATH = fileURLToPath(new URL('../../src/cli.js', import.meta.url))

/**
 * Runs the `lavax` CLI.
 *
 * @param {string[]} args
 * @returns {Promise<{ stdout: string; stderr: string; code: number }>}
 */
const runCLI = async (args) => {
  try {
    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      [CLI_PATH, ...args],
      { encoding: 'utf8' }
    )
    return { stdout, stderr, code: 0 }
  } catch (err) {
    const e = /** @type {any} */ (err)
    return { stdout: e.stdout, stderr: e.stderr, code: e.code }
  }
}

test('--help prints usage and the security model', async (t) => {
  const { stdout, code } = await runCLI(['--help'])
  t.is(code, 0)
  t.regex(stdout, /lavax/)
  t.regex(stdout, /install/i)
  t.regex(stdout, /policy/i)
})

test('--version matches package descriptor', async (t) => {
  const { stdout, code } = await runCLI(['--version'])
  t.is(code, 0)
  const { version } = /** @type {PackageJson} */ (
    await readJsonFile(new URL('../../package.json', import.meta.url))
  )
  t.is(stdout.trim(), `${version}`)
})

test('missing spec exits non-zero', async (t) => {
  const { code } = await runCLI([])
  t.is(code, 1)
})

test('rejects a non-http(s) registry without hitting the network', async (t) => {
  const cache = await mkdtemp(path.join(os.tmpdir(), 'lavamoat-run-e2e-'))
  t.teardown(() => rm(cache, { recursive: true, force: true }))
  const { code, stderr } = await runCLI([
    '--cache',
    cache,
    '--registry',
    'ftp://evil.example.com',
    'cowsay',
  ])
  t.is(code, 1)
  t.regex(stderr, /registry/i)
})
