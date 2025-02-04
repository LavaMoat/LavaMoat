import test from 'ava'
import { memfs } from 'memfs'
import {
  assertAbsolutePath,
  isAbsolutePath,
  isExecutablePathSync,
  isExecutableSymlink,
  isFileSync,
  isReadableFileSync,
  isReadablePathSync,
  isSymlinkSync,
  readJsonFile,
  realpathSync,
} from '../../src/fs.js'

test('readJsonFile() - reads and parses JSON file', async (t) => {
  const { vol, fs } = memfs()
  vol.fromJSON({ '/test.json': '{"key": "value"}' })
  const data = await readJsonFile('/test.json', { fs })
  t.deepEqual(data, { key: 'value' })
})

test('isFileSync() - returns true for real files', (t) => {
  const { vol, fs } = memfs()
  vol.fromJSON({ '/test.txt': 'content' })
  t.true(isFileSync('/test.txt', { fs }))
})

test('isFileSync() - returns false for non-files', (t) => {
  const { vol, fs } = memfs()
  vol.fromJSON({ '/test.txt': 'content' })
  vol.unlinkSync('/test.txt')
  t.false(isFileSync('/test.txt', { fs }))
})

test('isReadablePathSync() - returns true for readable paths', (t) => {
  const { vol, fs } = memfs()
  vol.fromJSON({ '/test.txt': 'content' })
  t.true(isReadablePathSync('/test.txt', { fs }))
})

// memfs does not really implement permissions
test.failing('isReadablePathSync returns false for non-readable paths', (t) => {
  const { vol, fs } = memfs()
  vol.fromJSON({ '/test.txt': 'content' })
  vol.chmodSync('/test.txt', 0o000)
  t.false(isReadablePathSync('/test.txt', { fs }))
})

test('isExecutablePathSync() - returns true for executable paths', (t) => {
  const { vol, fs } = memfs()
  vol.fromJSON({ '/test.txt': 'content' })
  vol.chmodSync('/test.txt', 0o755) // XXX: this does nothing; all paths are considered executable
  t.true(isExecutablePathSync('/test.txt', { fs }))
})

// memfs does not really implement permissions
test.failing(
  'isExecutablePathSync returns false for non-executable paths',
  (t) => {
    const { vol, fs } = memfs()
    vol.fromJSON({ '/test.txt': 'content' })
    vol.chmodSync('/test.txt', 0o644) // XXX: this does nothing
    t.false(isExecutablePathSync('/test.txt', { fs }))
  }
)
test('isReadableFileSync() - returns true for readable files', (t) => {
  const { vol, fs } = memfs()
  vol.fromJSON({ '/test.txt': 'content' })
  t.true(isReadableFileSync('/test.txt', { fs }))
})

// memfs does not really implement permissions
test.failing('isReadableFileSync returns false for non-readable files', (t) => {
  const { vol, fs } = memfs()
  vol.fromJSON({ '/test.txt': 'content' })
  vol.chmodSync('/test.txt', 0o000) // XXX: this does nothing
  t.false(isReadableFileSync('/test.txt', { fs }))
})

test('isExecutableSymlink() - returns true for executable symlinks', (t) => {
  const { vol, fs } = memfs()
  vol.fromJSON({ '/test.txt': 'content' })
  vol.symlinkSync('/test.txt', '/test-link')
  vol.chmodSync('/test-link', 0o755)
  t.true(isExecutableSymlink('/test-link', { fs }))
})
// memfs does not really implement permissions
test.failing(
  'isExecutableSymlink returns false for non-executable symlinks',
  (t) => {
    const { vol, fs } = memfs()
    vol.fromJSON({ '/test.txt': 'content' })
    vol.symlinkSync('/test.txt', '/test-link')
    vol.chmodSync('/test-link', 0o644) // XXX: this does nothing
    t.false(isExecutableSymlink('/test-link', { fs }))
  }
)

test('isSymlinkSync() - returns true for symlinks', (t) => {
  const { vol, fs } = memfs()
  vol.fromJSON({ '/test.txt': 'content' })
  vol.symlinkSync('/test.txt', '/test-link')
  t.true(isSymlinkSync('/test-link', { fs }))
})

test('isSymlinkSync() - returns false for non-symlinks', (t) => {
  const { vol, fs } = memfs()
  vol.fromJSON({ '/test.txt': 'content' })
  t.false(isSymlinkSync('/test.txt', { fs }))
})

test('assertAbsolutePath() - does not throw for absolute paths', (t) => {
  t.notThrows(() => assertAbsolutePath('/absolute/path'))
})

test('assertAbsolutePath() - throws for non-absolute paths', (t) => {
  t.throws(() => assertAbsolutePath('relative/path'))
})

test('isAbsolutePath() - returns true for absolute paths', (t) => {
  t.true(isAbsolutePath('/absolute/path'))
})

test('isAbsolutePath() - returns false for non-absolute paths', (t) => {
  t.false(isAbsolutePath('relative/path'))
})

test('realpathSync() - resolves symlinks', (t) => {
  const { vol, fs } = memfs()
  vol.fromJSON({ '/test.txt': 'content' })
  vol.symlinkSync('/test.txt', '/test-link')
  t.is(realpathSync('/test-link', { fs }), '/test.txt')
})
