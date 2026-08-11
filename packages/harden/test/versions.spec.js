import test from 'ava'
import { applyLatestVersion } from '../src/tools/versions.js'

/**
 * @param {string | undefined} packageManager
 */
function makeFacts(packageManager) {
  return {
    cwd: '/tmp',
    packageJson: packageManager ? { packageManager } : {},
    packageManagerField: null,
    hasPackageLock: false,
    lockfileVersion: null,
    hasNpmrc: false,
    hasYarnLock: false,
    hasYarnrc: false,
    hasYarnrcYml: false,
    yarnConfig: null,
    hasYarnState: false,
    hasPnpmLock: false,
    hasPnpmWorkspace: false,
    directGitDeps: [],
  }
}

function makeChanges() {
  return [
    {
      target: 'package.json',
      key: 'packageManager',
      value: 'yarn@4.16.0',
      ifNotExist: true,
    },
    {
      target: 'package.json',
      key: 'devEngines',
      value: {
        packageManager: {
          name: 'yarn',
          version: '>=4.16.0',
          onFail: 'error',
        },
      },
    },
  ]
}

test('applyLatestVersion upgrades both packageManager and devEngines when needed', (t) => {
  const changes = makeChanges()
  const result = applyLatestVersion(changes, makeFacts('yarn@4.15.0'), '4.17.1')

  t.truthy(result)
  t.deepEqual(result, [
    {
      target: 'package.json',
      key: 'packageManager',
      value: 'yarn@4.17.1',
    },
    {
      target: 'package.json',
      key: 'devEngines',
      value: {
        packageManager: {
          name: 'yarn',
          version: '>=4.17.1',
          onFail: 'error',
        },
      },
    },
  ])
})

test('applyLatestVersion keeps stronger preexisting packageManager and aligns devEngines', (t) => {
  const changes = makeChanges()
  const result = applyLatestVersion(changes, makeFacts('yarn@4.17.1'), '4.17.1')

  t.truthy(result)
  t.deepEqual(result, [
    {
      target: 'package.json',
      key: 'packageManager',
      value: 'yarn@4.16.0',
      ifNotExist: true,
    },
    {
      target: 'package.json',
      key: 'devEngines',
      value: {
        packageManager: {
          name: 'yarn',
          version: '>=4.17.1',
          onFail: 'error',
        },
      },
    },
  ])
})

test('applyLatestVersion keeps even higher preexisting packageManager instead of downgrading', (t) => {
  const changes = makeChanges()
  const result = applyLatestVersion(changes, makeFacts('yarn@4.20.0'), '4.17.1')

  t.truthy(result)
  t.deepEqual(result, [
    {
      target: 'package.json',
      key: 'packageManager',
      value: 'yarn@4.16.0',
      ifNotExist: true,
    },
    {
      target: 'package.json',
      key: 'devEngines',
      value: {
        packageManager: {
          name: 'yarn',
          version: '>=4.20.0',
          onFail: 'error',
        },
      },
    },
  ])
})
