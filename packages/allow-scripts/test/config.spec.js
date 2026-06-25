const test = require('ava')
const { applyMigrations } = require('../src/config.js')

/**
 * Cases:
 *
 * - PkgA: old version (#1.0.0) in allowConfig set to true → version updated to
 *   1.1.0
 * - PkgB: old version (#1.0.0) in allowConfig set to false → removed (no longer
 *   matches)
 * - PkgC: no version in allowConfig set to true → version added (#1.0.0)
 * - PkgD: no version in allowConfig set to false → unchanged (bare name covers
 *   it)
 */
test('applyMigrations - version migration cases', (t) => {
  const lifecycle = {
    packagesWithScripts: new Map([
      ['pkgA#1.1.0', [{}]],
      ['pkgB#1.1.0', [{}]],
      ['pkgC#1.0.0', [{}]],
      ['pkgD#1.0.0', [{}]],
    ]),
    allowedPatterns: ['pkgA#1.0.0', 'pkgC'],
    disallowedPatterns: ['pkgB#1.0.0', 'pkgD'],
    missingPolicies: ['pkgA#1.1.0', 'pkgB#1.1.0', 'pkgC#1.0.0'],
    excessPolicies: ['pkgA#1.0.0', 'pkgB#1.0.0', 'pkgE'],
    allowConfig: {
      'pkgA#1.0.0': true,
      'pkgB#1.0.0': false,
      pkgC: true,
      pkgD: false,
      pkgE: false,
    },
  }

  const result = applyMigrations({ lifecycle, skipVersions: false })

  t.snapshot(result, 'return value')
  t.snapshot(lifecycle.allowConfig, 'allowConfig after migrations')
})
test('applyMigrations - also work on first run', (t) => {
  const lifecycle = {
    packagesWithScripts: new Map([
      ['pkgA#1.1.0', [{}]],
      ['pkgB#1.1.0', [{}]],
      ['pkgC#1.0.0', [{}]],
      ['pkgD#1.0.0', [{}]],
    ]),
    allowedPatterns: [],
    disallowedPatterns: [],
    missingPolicies: ['pkgA#1.1.0', 'pkgB#1.1.0', 'pkgC#1.0.0', 'pkgD#1.0.0'],
    excessPolicies: [],
    allowConfig: {},
  }

  const result = applyMigrations({ lifecycle, skipVersions: false })

  t.snapshot(result, 'return value')
  t.snapshot(lifecycle.allowConfig, 'allowConfig after migrations')
})
