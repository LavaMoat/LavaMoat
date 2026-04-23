// @ts-check
const test = /** @type {import('ava').TestFn} */ (require('ava'))
const { writeFileSync, mkdirSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { join } = require('node:path')
const { buildCapabilities } = require('../src/runtime/capabilitiesBuilder.js')

/**
 * Creates a temporary directory with the given files and returns its path.
 *
 * @param {Record<string, string>} files Filename → content
 * @returns {string} Path to temp dir
 */
function makeTmpDir(files) {
  const dir = join(
    tmpdir(),
    `cap-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
  )
  mkdirSync(dir, { recursive: true })
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(dir, name), content, 'utf8')
  }
  return dir
}

test('no use in policy → empty fragments', (t) => {
  const result = buildCapabilities({ resources: {} }, __dirname)
  t.deepEqual(result, { capabilitySources: [], capabilityNames: {} })
})

test('empty use array → empty fragments', (t) => {
  const result = buildCapabilities({ resources: {}, use: [] }, __dirname)
  t.deepEqual(result, { capabilitySources: [], capabilityNames: {} })
})

test('single module, one file → fragments generated', (t) => {
  const dir = makeTmpDir({
    'cap-file.js': `defineCapability('my-cap', { endow() {} })`,
    'cap-module.js': `module.exports = [{ names: ['my-cap'], file: require.resolve('./cap-file.js') }]`,
  })

  const result = buildCapabilities(
    { resources: {}, use: [join(dir, 'cap-module.js')] },
    dir
  )

  t.is(result.capabilitySources.length, 1)
  t.is(
    result.capabilitySources[0],
    `defineCapability('my-cap', { endow() {} })`
  )
  t.deepEqual(result.capabilityNames, { 'my-cap': 0 })
})

test('use entry as relative path is resolved from fromDir', (t) => {
  const dir = makeTmpDir({
    'cap-file.js': `defineCapability('rel-cap', { endow() {} })`,
    'cap-module.js': `module.exports = [{ names: ['rel-cap'], file: require.resolve('./cap-file.js') }]`,
  })

  // Pass a relative specifier — must be resolved from dir, not from this test file
  const result = buildCapabilities(
    { resources: {}, use: ['./cap-module.js'] },
    dir
  )

  t.is(result.capabilitySources.length, 1)
  t.deepEqual(result.capabilityNames, { 'rel-cap': 0 })
})

test('multiple modules → all files collected and names flattened', (t) => {
  const dir = makeTmpDir({
    'file-a.js': `defineCapability('cap-a', {})`,
    'file-b.js': `defineCapability('cap-b', {})`,
    'module-a.js': `module.exports = [{ names: ['cap-a'], file: require.resolve('./file-a.js') }]`,
    'module-b.js': `module.exports = [{ names: ['cap-b'], file: require.resolve('./file-b.js') }]`,
  })

  const result = buildCapabilities(
    {
      resources: {},
      use: [join(dir, 'module-a.js'), join(dir, 'module-b.js')],
    },
    dir
  )

  t.is(result.capabilitySources.length, 2)
  t.deepEqual(result.capabilityNames, { 'cap-a': 0, 'cap-b': 1 })
})

test('one file with two capability names → single source entry', (t) => {
  const dir = makeTmpDir({
    'multi.js': `defineCapability('cap-x', {}); defineCapability('cap-y', {})`,
    'module.js': `module.exports = [{ names: ['cap-x', 'cap-y'], file: require.resolve('./multi.js') }]`,
  })

  const result = buildCapabilities(
    { resources: {}, use: [join(dir, 'module.js')] },
    dir
  )

  t.is(result.capabilitySources.length, 1)
  t.deepEqual(result.capabilityNames, { 'cap-x': 0, 'cap-y': 0 })
})

test('same file referenced by two modules → build error', (t) => {
  const dir = makeTmpDir({
    'shared.js': `defineCapability('cap-p', {})`,
    'mod-a.js': `module.exports = [{ names: ['cap-p'], file: require.resolve('./shared.js') }]`,
    'mod-b.js': `module.exports = [{ names: ['cap-q'], file: require.resolve('./shared.js') }]`,
  })

  t.throws(
    () =>
      buildCapabilities(
        {
          resources: {},
          use: [join(dir, 'mod-a.js'), join(dir, 'mod-b.js')],
        },
        dir
      ),
    {
      message:
        /duplicate.*file|file.*referenced.*multiple|already.*referenced/i,
    }
  )
})

// ---------------------------------------------------------------------------
// Error cases
// ---------------------------------------------------------------------------

test('name collision across modules → build error', (t) => {
  const dir = makeTmpDir({
    'file-a.js': `defineCapability('dup', {})`,
    'file-b.js': `defineCapability('dup', {})`,
    'mod-a.js': `module.exports = [{ names: ['dup'], file: require.resolve('./file-a.js') }]`,
    'mod-b.js': `module.exports = [{ names: ['dup'], file: require.resolve('./file-b.js') }]`,
  })

  t.throws(
    () =>
      buildCapabilities(
        {
          resources: {},
          use: [join(dir, 'mod-a.js'), join(dir, 'mod-b.js')],
        },
        dir
      ),
    { message: /duplicate capability name.*dup/i }
  )
})

test('missing file referenced by module → build error', (t) => {
  const dir = makeTmpDir({
    'mod.js': `module.exports = [{ names: ['cap'], file: '/nonexistent/path/cap.js' }]`,
  })

  t.throws(
    () => buildCapabilities({ resources: {}, use: [join(dir, 'mod.js')] }, dir),
    { message: /nonexistent/ }
  )
})

test('module with wrong shape → build error', (t) => {
  const dir = makeTmpDir({
    'bad-mod.js': `module.exports = { names: ['cap'], file: './cap.js' }`,
  })

  t.throws(
    () =>
      buildCapabilities({ resources: {}, use: [join(dir, 'bad-mod.js')] }, dir),
    { message: /must export an array/i }
  )
})
