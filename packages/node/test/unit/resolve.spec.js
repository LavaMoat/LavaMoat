import '../../src/preamble.js'

import test from 'ava'
import { memfs } from 'memfs'
import { resolveBinScript, resolveWorkspace } from '../../src/resolve.js'

test('resolveBinScript - resolves bin script path', (t) => {
  const { vol, fs } = memfs()
  vol.fromJSON({
    '/workspace/package.json': JSON.stringify({ name: 'test-app' }),
    '/workspace/node_modules/test-package/test-bin': 'content',
    '/workspace/node_modules/test-package/package.json': JSON.stringify({
      bin: 'test-bin',
    }),
    '/workspace/node_modules/.bin': null,
  })
  fs.symlinkSync(
    '/workspace/node_modules/test-package/test-bin',
    '/workspace/node_modules/.bin/test-bin'
  )
  const binPath = resolveBinScript('test-bin', { from: '/workspace', fs })
  t.is(binPath, '/workspace/node_modules/.bin/test-bin')
})

test('resolveBinScript - throws error if workspace not found', (t) => {
  const { fs } = memfs()
  t.throws(
    () => {
      resolveBinScript('test-bin', { from: '/nonexistent', fs })
    },
    { message: /Could not find a workspace/ }
  )
})

test('resolveWorkspace - resolves workspace path', (t) => {
  const { vol, fs } = memfs()
  vol.fromJSON({
    '/workspace/package.json': JSON.stringify({}),
  })
  const workspacePath = resolveWorkspace({ from: '/workspace', fs })
  t.is(workspacePath, '/workspace')
})

test('resolveWorkspace - throws error if workspace not found', (t) => {
  const { fs } = memfs()
  t.throws(
    () => {
      resolveWorkspace({ from: '/nonexistent', fs })
    },
    { message: /Could not find a workspace/ }
  )
})
