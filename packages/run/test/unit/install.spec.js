import test from 'ava'
import { EventEmitter } from 'node:events'
import {
  assertValidRegistry,
  buildNpmArgs,
  installPackage,
  sanitizeNpmEnv,
} from '../../src/install.js'
import { InstallError } from '../../src/error.js'

test('buildNpmArgs - disables scripts by default', (t) => {
  const args = buildNpmArgs('cowsay')
  t.true(args.includes('--ignore-scripts'))
  t.is(args[0], 'install')
  t.true(args.includes('cowsay'))
})

test('buildNpmArgs - spec is placed last, after a "--" guard', (t) => {
  const args = buildNpmArgs('cowsay')
  t.is(args[args.length - 1], 'cowsay')
  t.is(args[args.length - 2], '--')
  // A "-"-leading spec is therefore inert as an npm flag.
  const evil = buildNpmArgs('--ignore-scripts=false')
  t.is(evil[evil.length - 1], '--ignore-scripts=false')
  t.is(evil[evil.length - 2], '--')
})

test('buildNpmArgs - rejects a non-http(s) registry', (t) => {
  t.throws(() => buildNpmArgs('cowsay', { registry: 'file:///etc' }), {
    instanceOf: InstallError,
  })
  t.throws(() => buildNpmArgs('cowsay', { registry: 'not a url' }), {
    instanceOf: InstallError,
  })
})

test('assertValidRegistry - accepts http(s), rejects others', (t) => {
  t.notThrows(() => assertValidRegistry('https://r.example.com'))
  t.notThrows(() => assertValidRegistry('http://localhost:4873'))
  t.throws(() => assertValidRegistry('ftp://r.example.com'), {
    instanceOf: InstallError,
  })
})

test('sanitizeNpmEnv - strips script/code-injection vars, keeps the rest', (t) => {
  const cleaned = sanitizeNpmEnv({
    PATH: '/usr/bin',
    NODE_OPTIONS: '--require /evil.js',
    npm_config_ignore_scripts: 'false',
    npm_config_node_options: '--require /evil.js',
    npm_config_script_shell: '/bin/evil',
    npm_config_registry: 'https://r.example.com',
  })
  t.is(cleaned.PATH, '/usr/bin')
  t.is(cleaned.npm_config_registry, 'https://r.example.com')
  t.is(cleaned.NODE_OPTIONS, undefined)
  t.is(cleaned.npm_config_ignore_scripts, undefined)
  t.is(cleaned.npm_config_node_options, undefined)
  t.is(cleaned.npm_config_script_shell, undefined)
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
