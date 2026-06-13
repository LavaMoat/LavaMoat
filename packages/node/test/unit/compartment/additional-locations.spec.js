import test from 'ava'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { buildAdditionalLocations } from '../../../src/compartment/additional-locations.js'

const PROJECT_ROOT = '/fake/project'

/**
 * @param {string[]} parts
 * @returns
 */
const fileUrl = (...parts) => pathToFileURL(path.join(...parts, './')).href

test('buildAdditionalLocations - returns empty array when policy is undefined', (t) => {
  t.deepEqual(buildAdditionalLocations(undefined, PROJECT_ROOT), [])
})

test('buildAdditionalLocations - returns empty array when policy has no additionalLocations', (t) => {
  t.deepEqual(buildAdditionalLocations({ resources: {} }, PROJECT_ROOT), [])
})

test('buildAdditionalLocations - returns empty array when additionalLocations is empty', (t) => {
  t.deepEqual(
    buildAdditionalLocations(
      { resources: {}, additionalLocations: [] },
      PROJECT_ROOT
    ),
    []
  )
})

test('buildAdditionalLocations - converts string entries to file URL objects', (t) => {
  const result = buildAdditionalLocations(
    { resources: {}, additionalLocations: ['vendor/foo'] },
    PROJECT_ROOT
  )
  t.deepEqual(result, [{ location: fileUrl(PROJECT_ROOT, 'vendor/foo') }])
})

test('buildAdditionalLocations - handles multiple string entries', (t) => {
  const result = buildAdditionalLocations(
    { resources: {}, additionalLocations: ['vendor/foo', 'vendor/bar'] },
    PROJECT_ROOT
  )
  t.deepEqual(result, [
    { location: fileUrl(PROJECT_ROOT, 'vendor/foo') },
    { location: fileUrl(PROJECT_ROOT, 'vendor/bar') },
  ])
})

test('buildAdditionalLocations - converts object entry with modules to file URL object with modules', (t) => {
  const modules = ['index.js', 'utils.js']
  const result = buildAdditionalLocations(
    {
      resources: {},
      additionalLocations: [{ location: 'vendor/foo', modules }],
    },
    PROJECT_ROOT
  )
  t.deepEqual(result, [
    { location: fileUrl(PROJECT_ROOT, 'vendor/foo'), modules },
  ])
})

test('buildAdditionalLocations - converts object entry without modules to file URL object without modules', (t) => {
  const result = buildAdditionalLocations(
    { resources: {}, additionalLocations: [{ location: 'vendor/foo' }] },
    PROJECT_ROOT
  )
  t.deepEqual(result, [{ location: fileUrl(PROJECT_ROOT, 'vendor/foo') }])
})

test('buildAdditionalLocations - handles mixed string and object entries', (t) => {
  const modules = ['main.js']
  const result = buildAdditionalLocations(
    {
      resources: {},
      additionalLocations: [
        'vendor/string-pkg',
        { location: 'vendor/obj-pkg', modules },
        { location: 'vendor/no-modules-pkg' },
      ],
    },
    PROJECT_ROOT
  )
  t.deepEqual(result, [
    { location: fileUrl(PROJECT_ROOT, 'vendor/string-pkg') },
    { location: fileUrl(PROJECT_ROOT, 'vendor/obj-pkg'), modules },
    { location: fileUrl(PROJECT_ROOT, 'vendor/no-modules-pkg') },
  ])
})

test('buildAdditionalLocations - location URLs have trailing slash', (t) => {
  const result = buildAdditionalLocations(
    { resources: {}, additionalLocations: ['vendor/foo'] },
    PROJECT_ROOT
  )
  t.true(
    result?.[0].location.endsWith('/'),
    `Expected trailing slash, got: ${result?.[0].location}`
  )
})

test('buildAdditionalLocations - uses process.cwd() as default projectRoot', (t) => {
  const result = buildAdditionalLocations({
    resources: {},
    additionalLocations: ['vendor/foo'],
  })
  t.true(
    result?.[0]?.location.startsWith(pathToFileURL(process.cwd()).href),
    `Expected location to be relative to cwd, got: ${result?.[0]?.location}`
  )
})
