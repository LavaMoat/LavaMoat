import test from 'ava'
import { toFileURLString } from '../../../src/util.js'
import {
  buildAdditionalLocations,
  buildPreloads,
} from '../../../src/compartment/includes.js'
import path from 'node:path'
import { ErrorCodes } from '../../../src/error-code.js'

const PROJECT_ROOT = '/fake/project'

/**
 * Computes the compartment name (file URL string) for a location the same way
 * {@link buildPreloads} does internally.
 *
 * @param {string} location
 * @param {string} [projectRoot]
 * @returns {string}
 */
const compartmentNameFor = (location, projectRoot = PROJECT_ROOT) =>
  toFileURLString(path.join(projectRoot, location, '/'))

/**
 * A `packageCompartmentMap` with no compartments, for cases where the lookup is
 * never exercised (string and by-name entries).
 *
 * @type {import('@endo/compartment-mapper').PackageCompartmentMapDescriptor}
 */
const EMPTY_COMPARTMENT_MAP = /** @type {any} */ ({ compartments: {} })

/**
 * Builds a minimal `packageCompartmentMap` containing a single compartment for
 * the given location.
 *
 * @param {string} location
 * @param {string} label
 * @param {string} [projectRoot]
 * @returns {import('@endo/compartment-mapper').PackageCompartmentMapDescriptor}
 */
const makePackageCompartmentMap = (
  location,
  label,
  projectRoot = PROJECT_ROOT
) =>
  /** @type {any} */ ({
    compartments: {
      [compartmentNameFor(location, projectRoot)]: { label, name: label },
    },
  })

test('buildAdditionalLocations - returns empty array when no includes provided', (t) => {
  t.deepEqual(buildAdditionalLocations(), [])
})

test('buildAdditionalLocations - returns empty array when includes only contains strings', (t) => {
  t.deepEqual(buildAdditionalLocations(['vendor/foo']), [])
})

test('buildAdditionalLocations - returns empty array when includes only contains IncludeEntryByName objects', (t) => {
  t.deepEqual(buildAdditionalLocations([{ name: 'vendor/foo' }]), [])
})

test('buildAdditionalLocations - handles multiple entries', (t) => {
  const result = buildAdditionalLocations(
    [{ location: 'vendor/foo' }, { location: 'vendor/bar' }],
    {
      projectRoot: PROJECT_ROOT,
    }
  )
  t.deepEqual(result, [
    { location: toFileURLString(path.join(PROJECT_ROOT, 'vendor/foo/')) },
    { location: toFileURLString(path.join(PROJECT_ROOT, 'vendor/bar/')) },
  ])
})

test('buildAdditionalLocations - converts object entry with modules to file URL object with modules', (t) => {
  const modules = ['index.js', 'utils.js']
  const result = buildAdditionalLocations(
    [{ location: 'vendor/foo', modules }],
    { projectRoot: PROJECT_ROOT }
  )
  t.deepEqual(result, [
    {
      location: toFileURLString(path.join(PROJECT_ROOT, 'vendor/foo/')),
      modules,
    },
  ])
})

test('buildAdditionalLocations - converts object entry without modules to file URL object without modules', (t) => {
  const result = buildAdditionalLocations([{ location: 'vendor/foo' }], {
    projectRoot: PROJECT_ROOT,
  })
  t.deepEqual(result, [
    { location: toFileURLString(path.join(PROJECT_ROOT, 'vendor/foo/')) },
  ])
})

test('buildAdditionalLocations - handles entries w/ and w/o modules', (t) => {
  const modules = ['main.js']
  const result = buildAdditionalLocations(
    [
      { location: 'vendor/string-pkg' },
      { location: 'vendor/obj-pkg', modules },
    ],
    { projectRoot: PROJECT_ROOT }
  )
  t.deepEqual(result, [
    {
      location: toFileURLString(path.join(PROJECT_ROOT, 'vendor/string-pkg/')),
    },
    {
      location: toFileURLString(path.join(PROJECT_ROOT, 'vendor/obj-pkg/')),
      modules,
    },
  ])
})

test('buildAdditionalLocations - location URLs have trailing slash', (t) => {
  const result = buildAdditionalLocations([{ location: 'vendor/foo' }], {
    projectRoot: PROJECT_ROOT,
  })
  t.true(
    result?.[0].location.endsWith('/'),
    `Expected trailing slash, got: ${result?.[0].location}`
  )
})

test('buildAdditionalLocations - uses process.cwd() as default projectRoot', (t) => {
  const result = buildAdditionalLocations([{ location: 'vendor/foo' }], {
    projectRoot: process.cwd(),
  })
  t.true(
    result?.[0]?.location.startsWith(toFileURLString(path.join(process.cwd()))),
    `Expected location to be relative to cwd, got: ${result?.[0]?.location}`
  )
})

test('buildAdditionalLocations - throws when location attempts to ascend above the project root', (t) => {
  t.throws(
    () =>
      buildAdditionalLocations([{ location: '../vendor/foo' }], {
        projectRoot: PROJECT_ROOT,
      }),
    { code: ErrorCodes.InvalidPolicy }
  )
})

test('buildAdditionalLocations - throws when module path attempts to ascend above the location', (t) => {
  t.throws(
    () =>
      buildAdditionalLocations(
        [{ location: 'vendor/foo', modules: ['../bar'] }],
        {
          projectRoot: PROJECT_ROOT,
        }
      ),
    { code: ErrorCodes.InvalidPolicy }
  )
})

test('buildPreloads - returns empty array when no includes provided', (t) => {
  t.deepEqual(buildPreloads(EMPTY_COMPARTMENT_MAP), [])
})

test('buildPreloads - returns empty array when includes is an empty array', (t) => {
  t.deepEqual(buildPreloads(EMPTY_COMPARTMENT_MAP, []), [])
})

test('buildPreloads - passes through string entries unchanged', (t) => {
  t.deepEqual(
    buildPreloads(EMPTY_COMPARTMENT_MAP, ['vendor/foo', 'vendor/bar']),
    ['vendor/foo', 'vendor/bar']
  )
})

test('buildPreloads - IncludeEntryByName without modules yields a single entry with "." entrypoint', (t) => {
  t.deepEqual(buildPreloads(EMPTY_COMPARTMENT_MAP, [{ name: 'vendor/foo' }]), [
    { compartment: 'vendor/foo', entry: '.' },
  ])
})

test('buildPreloads - IncludeEntryByName with modules yields one entry per module', (t) => {
  t.deepEqual(
    buildPreloads(EMPTY_COMPARTMENT_MAP, [
      { name: 'vendor/foo', modules: ['index.js', 'utils.js'] },
    ]),
    [
      { compartment: 'vendor/foo', entry: 'index.js' },
      { compartment: 'vendor/foo', entry: 'utils.js' },
    ]
  )
})

test('buildPreloads - IncludeEntryByName with empty modules array falls back to "." entrypoint', (t) => {
  t.deepEqual(
    buildPreloads(EMPTY_COMPARTMENT_MAP, [{ name: 'vendor/foo', modules: [] }]),
    [{ compartment: 'vendor/foo', entry: '.' }]
  )
})

test('buildPreloads - IncludeEntryByLocation without modules resolves to the compartment label with "." entrypoint', (t) => {
  const packageCompartmentMap = makePackageCompartmentMap(
    'vendor/foo',
    'foo>1.0.0'
  )
  t.deepEqual(
    buildPreloads(packageCompartmentMap, [{ location: 'vendor/foo' }], {
      projectRoot: PROJECT_ROOT,
    }),
    [{ compartment: 'foo>1.0.0', entry: '.' }]
  )
})

test('buildPreloads - IncludeEntryByLocation with modules yields one entry per module using the compartment label', (t) => {
  const packageCompartmentMap = makePackageCompartmentMap(
    'vendor/foo',
    'foo>1.0.0'
  )
  t.deepEqual(
    buildPreloads(
      packageCompartmentMap,
      [{ location: 'vendor/foo', modules: ['index.js', 'utils.js'] }],
      { projectRoot: PROJECT_ROOT }
    ),
    [
      { compartment: 'foo>1.0.0', entry: 'index.js' },
      { compartment: 'foo>1.0.0', entry: 'utils.js' },
    ]
  )
})

test('buildPreloads - handles a mix of string, by-name, and by-location entries', (t) => {
  const packageCompartmentMap = makePackageCompartmentMap(
    'vendor/foo',
    'foo>1.0.0'
  )
  t.deepEqual(
    buildPreloads(
      packageCompartmentMap,
      [
        'some-specifier',
        { name: 'vendor/bar', modules: ['main.js'] },
        { location: 'vendor/foo' },
      ],
      { projectRoot: PROJECT_ROOT }
    ),
    [
      'some-specifier',
      { compartment: 'vendor/bar', entry: 'main.js' },
      { compartment: 'foo>1.0.0', entry: '.' },
    ]
  )
})

test('buildPreloads - throws InvalidPolicyError when location attempts to ascend above the project root', (t) => {
  t.throws(
    () =>
      buildPreloads(EMPTY_COMPARTMENT_MAP, [{ location: '../vendor/foo' }], {
        projectRoot: PROJECT_ROOT,
      }),
    { code: ErrorCodes.InvalidPolicy }
  )
})

test('buildPreloads - throws GenerationError when the compartment is not found in the packageCompartmentMap', (t) => {
  t.throws(
    () =>
      buildPreloads(EMPTY_COMPARTMENT_MAP, [{ location: 'vendor/foo' }], {
        projectRoot: PROJECT_ROOT,
      }),
    { code: ErrorCodes.GenerationFailure }
  )
})

test('buildPreloads - uses process.cwd() as default projectRoot for location lookups', (t) => {
  const packageCompartmentMap = makePackageCompartmentMap(
    'vendor/foo',
    'foo>1.0.0',
    process.cwd()
  )
  t.deepEqual(
    buildPreloads(packageCompartmentMap, [{ location: 'vendor/foo' }]),
    [{ compartment: 'foo>1.0.0', entry: '.' }]
  )
})
