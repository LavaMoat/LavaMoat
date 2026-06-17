import test from 'ava'
import { EventEmitter } from 'node:events'
import { buildNpmArgs, installPackage } from '../../src/install.js'
import { InstallError } from '../../src/error.js'

test('buildNpmArgs - disables scripts by default', (t) => {
  const args = buildNpmArgs('cowsay')
  t.true(args.includes('--ignore-scripts'))
  t.is(args[0], 'install')
  t.true(args.includes('cowsay'))
})

test('buildNpmArgs - omits --ignore-scripts when allowScripts', (t) => {
  const args = buildNpmArgs('cowsay', { allowScripts: true })
  t.false(args.includes('--ignore-scripts'))
})

test('buildNpmArgs - includes registry', (t) => {
  const args = buildNpmArgs('cowsay', { registry: 'https://r.example.com' })
  const i = args.indexOf('--registry')
  t.true(i !== -1)
  t.is(args[i + 1], 'https://r.example.com')
})

test('buildNpmArgs - quiet sets silent loglevel', (t) => {
  const args = buildNpmArgs('cowsay', { quiet: true })
  const i = args.indexOf('--loglevel')
  t.is(args[i + 1], 'silent')
})

/**
 * Builds a fake `spawn` that records calls and drives a child via `behavior`.
 *
 * @param {(child: EventEmitter) => void} behavior
 */
const makeSpawn = (behavior) => {
  /** @type {{ cmd: string; args: string[] }[]} */
  const calls = []
  /** @type {any} */
  const spawn = (/** @type {string} */ cmd, /** @type {string[]} */ args) => {
    const child = new EventEmitter()
    calls.push({ cmd, args })
    setImmediate(() => behavior(child))
    return child
  }
  return { spawn, calls }
}

test('installPackage - resolves on exit code 0', async (t) => {
  const { spawn, calls } = makeSpawn((child) => child.emit('close', 0))
  await t.notThrowsAsync(installPackage('cowsay', { cwd: '/sandbox', spawn }))
  t.true(calls[0].args.includes('--ignore-scripts'))
})

test('installPackage - rejects on non-zero exit code', async (t) => {
  const { spawn } = makeSpawn((child) => child.emit('close', 1))
  await t.throwsAsync(installPackage('cowsay', { cwd: '/sandbox', spawn }), {
    instanceOf: InstallError,
    message: /exited with code 1/,
  })
})

test('installPackage - rejects when spawn errors', async (t) => {
  const { spawn } = makeSpawn((child) =>
    child.emit('error', new Error('ENOENT'))
  )
  await t.throwsAsync(installPackage('cowsay', { cwd: '/sandbox', spawn }), {
    instanceOf: InstallError,
    message: /Failed to spawn/,
  })
})
