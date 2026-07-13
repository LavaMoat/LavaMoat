import '../../src/preamble.js'

// eslint-disable-next-line ava/use-test
import anyTest from 'ava'
import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { resolveBinScript, resolveEntrypoint } from '../../src/resolve.js'

/**
 * @import {TestFn} from 'ava'
 */

/**
 * @typedef ResolveEntrypointContext
 * @property {string} tempdir
 */

const test = /** @type {TestFn<ResolveEntrypointContext>} */ (anyTest)

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
  const resolvedPath = resolveEntrypoint(entrypointPath)
  // this is for macos which symlinks /tmp/ to /private/tmp/
  const realEntrypointPath = await realpath(entrypointPath)
  t.is(resolvedPath, realEntrypointPath)
})

test('resolveEntrypoint - throws error if entrypoint not found', (t) => {
  const entrypointPath = path.join(t.context.tempdir, 'nonexistent.js')
  t.throws(
    () => {
      resolveEntrypoint(entrypointPath)
    },
    { message: /Cannot find module/ }
  )
})

test('resolveBinScript - resolves bin from pnpm wrapper script', async (t) => {
  const root = t.context.tempdir
  const binDir = path.join(root, 'node_modules', '.bin')
  const targetScript = path.join(
    root,
    'node_modules',
    '.pnpm',
    'some-pkg@1.0.0',
    'node_modules',
    'some-pkg',
    'cli.js'
  )

  await mkdir(binDir, { recursive: true })
  await mkdir(path.join(root, 'node_modules', 'some-pkg'), { recursive: true })
  await mkdir(path.dirname(targetScript), { recursive: true })
  await writeFile(path.join(root, 'package.json'), '{}')
  await writeFile(targetScript, '#!/usr/bin/env node\nconsole.log("some-pkg")')

  const wrapper = `
#!/bin/sh
basedir=$(dirname "$(echo "$0" | sed -e 's,\\\\,/,g')")

case \`uname\` in
    *CYGWIN*|*MINGW*|*MSYS*)
        if command -v cygpath > /dev/null 2>&1; then
            basedir=\`cygpath -w "$basedir"\`
        fi
    ;;
esac

if [ -z "$NODE_PATH" ]; then
  export NODE_PATH="…"
else
  export NODE_PATH="…"
fi
if [ -x "$basedir/node" ]; then
  exec "$basedir/node"  "$basedir/../.pnpm/some-pkg@1.0.0/node_modules/some-pkg/cli.js" "$@"
else
  exec node  "$basedir/../.pnpm/some-pkg@1.0.0/node_modules/some-pkg/cli.js" "$@"
fi
`

  await writeFile(path.join(binDir, 'some-pkg'), wrapper, { mode: 0o755 })

  const resolved = resolveBinScript('some-pkg', { from: root })
  const expected = await realpath(targetScript)
  t.is(resolved, expected)
})
