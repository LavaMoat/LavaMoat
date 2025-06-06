import '../../src/preamble.js'

import { log, LogLevels } from '@lavamoat/vog'
// eslint-disable-next-line ava/use-test
import anyTest from 'ava'
import { mkdtemp, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { Resolver } from '../../src/resolve.js'

/**
 * @import {TestFn} from 'ava'
 */

/**
 * @typedef ResolveEntrypointContext
 * @property {string} tempdir
 */

const test = /** @type {TestFn<ResolveEntrypointContext>} */ (anyTest)

log.level = LogLevels.silent
const resolver = new Resolver({ log })

test.beforeEach(async (t) => {
  t.context.tempdir = await mkdtemp(
    path.join(tmpdir(), 'lavamoat-node-e2e-resolve')
  )
})

test.afterEach(async (t) => {
  await rm(t.context.tempdir, { recursive: true, force: true })
})

test('resolveEntrypoint - resolves entrypoint path', async (t) => {
  const entrypointPath = path.join(t.context.tempdir, 'index.js')

  await writeFile(entrypointPath, 'console.log("Hello, world!")')
  const resolvedPath = resolver.resolveEntrypoint(entrypointPath)
  // this is for macos which symlinks /tmp/ to /private/tmp/
  const realEntrypointPath = await realpath(entrypointPath)
  t.is(resolvedPath, realEntrypointPath)
})

test('resolveEntrypoint - throws error if entrypoint not found', (t) => {
  const entrypointPath = path.join(t.context.tempdir, 'nonexistent.js')
  t.throws(
    () => {
      resolver.resolveEntrypoint(entrypointPath)
    },
    { message: /Cannot find module/ }
  )
})
