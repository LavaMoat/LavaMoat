import '../../src/preamble.js'

import { log, LogLevels } from '@lavamoat/vog'
import test from 'ava'
import { memfs } from 'memfs'
import { ErrorCodes } from '../../src/error-code.js'
import { Resolver } from '../../src/resolve.js'

log.level = LogLevels.silent
const resolver = new Resolver({ log })

test('resolveBinScript - resolves real bin script path', (t) => {
  const { vol, fs } = memfs()
  vol.fromJSON({
    '/workspace/package.json': JSON.stringify({ name: 'test-app' }),
    '/workspace/node_modules/test-package/test-bin': 'content',
    '/workspace/node_modules/test-package/package.json': JSON.stringify({
      bin: 'test-bin',
    }),
    '/workspace/node_modules/.bin': null,
  })
  // not possible to use fromJSON to create a symlink
  fs.symlinkSync(
    '/workspace/node_modules/test-package/test-bin',
    '/workspace/node_modules/.bin/test-bin'
  )
  const binPath = resolver.resolveBinScript('test-bin', {
    from: '/workspace',
    fs,
  })
  t.is(binPath, '/workspace/node_modules/test-package/test-bin')
})

test('resolveBinScript - throws error if workspace not found', (t) => {
  const { fs } = memfs()
  t.throws(
    () => {
      resolver.resolveBinScript('test-bin', { from: '/nonexistent', fs })
    },
    { code: ErrorCodes.NoWorkspace }
  )
})

test('resolveWorkspace - resolves workspace path', (t) => {
  const { vol, fs } = memfs()
  vol.fromJSON({
    '/workspace/package.json': JSON.stringify({}),
  })
  const workspacePath = resolver.resolveWorkspace({ from: '/workspace', fs })
  t.is(workspacePath, '/workspace')
})

test('resolveWorkspace - throws error if workspace not found', (t) => {
  const { fs } = memfs()
  t.throws(
    () => {
      resolver.resolveWorkspace({ from: '/nonexistent', fs })
    },
    { code: ErrorCodes.NoWorkspace }
  )
})
