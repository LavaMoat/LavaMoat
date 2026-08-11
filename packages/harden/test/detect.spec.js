import test from 'ava'
import { detectPackageManager } from '../src/tools/detect.js'

/** @param {Partial<import('../src/tools/types.js').Facts>} overrides */
const facts = (overrides) => ({
  cwd: '/tmp/test',
  packageJson: null,
  packageManagerField: null,
  hasPackageLock: false,
  lockfileVersion: null,
  hasNpmrc: false,
  hasYarnLock: false,
  hasYarnrc: false,
  hasYarnrcYml: false,
  hasPnpmLock: false,
  hasPnpmWorkspace: false,
  directGitDeps: [],
  ...overrides,
})

// packageManager field — highest priority

test('detects npm from packageManager field', (t) => {
  t.deepEqual(
    detectPackageManager(facts({ packageManagerField: 'npm@10.2.3' })),
    {
      name: 'npm',
      version: '10.2.3',
    }
  )
})

test('detects yarn from packageManager field', (t) => {
  t.deepEqual(
    detectPackageManager(facts({ packageManagerField: 'yarn@4.15.0' })),
    {
      name: 'yarn',
      version: '4.15.0',
    }
  )
})

test('detects pnpm from packageManager field', (t) => {
  t.deepEqual(
    detectPackageManager(facts({ packageManagerField: 'pnpm@9.1.0' })),
    {
      name: 'pnpm',
      version: '9.1.0',
    }
  )
})

test('ignores malformed packageManager field and falls back', (t) => {
  // malformed field - no @version
  t.deepEqual(
    detectPackageManager(
      facts({ packageManagerField: 'npm', hasPackageLock: true })
    ),
    { name: 'npm', version: null }
  )
})

test('ignores unknown pm in packageManager field and falls back', (t) => {
  t.deepEqual(
    detectPackageManager(
      facts({ packageManagerField: 'bun@1.0.0', hasPackageLock: true })
    ),
    { name: 'npm', version: null }
  )
})

// lockfile detection

test('detects yarn from yarn.lock', (t) => {
  t.deepEqual(detectPackageManager(facts({ hasYarnLock: true })), {
    name: 'yarn',
    version: null,
  })
})

test('detects pnpm from pnpm-lock.yaml', (t) => {
  t.deepEqual(detectPackageManager(facts({ hasPnpmLock: true })), {
    name: 'pnpm',
    version: null,
  })
})

test('detects npm from package-lock.json', (t) => {
  t.deepEqual(detectPackageManager(facts({ hasPackageLock: true })), {
    name: 'npm',
    version: null,
  })
})

// priority: packageManager field beats lockfiles

test('packageManager field beats yarn.lock', (t) => {
  t.deepEqual(
    detectPackageManager(
      facts({ packageManagerField: 'pnpm@9.0.0', hasYarnLock: true })
    ),
    { name: 'pnpm', version: '9.0.0' }
  )
})

test('packageManager field beats package-lock.json', (t) => {
  t.deepEqual(
    detectPackageManager(
      facts({ packageManagerField: 'yarn@4.0.0', hasPackageLock: true })
    ),
    { name: 'yarn', version: '4.0.0' }
  )
})

// priority among lockfiles: yarn > pnpm > npm

test('yarn.lock beats pnpm-lock.yaml', (t) => {
  t.deepEqual(
    detectPackageManager(facts({ hasYarnLock: true, hasPnpmLock: true })),
    { name: 'yarn', version: null }
  )
})

test('yarn.lock beats package-lock.json', (t) => {
  t.deepEqual(
    detectPackageManager(facts({ hasYarnLock: true, hasPackageLock: true })),
    { name: 'yarn', version: null }
  )
})

test('pnpm-lock.yaml beats package-lock.json', (t) => {
  t.deepEqual(
    detectPackageManager(facts({ hasPnpmLock: true, hasPackageLock: true })),
    { name: 'pnpm', version: null }
  )
})

// no signals

test('returns null when nothing detected', (t) => {
  t.is(detectPackageManager(facts({})), null)
})
