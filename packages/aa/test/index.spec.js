const path = require('node:path')
const test = require('ava')
const { loadCanonicalNameMap } = require('../src/index.js')
const { Module } = require('node:module')
const { createProject4Symlink, normalizePaths } = require('./utils.js')

/**
 * @param {import('../src/index.js').CanonicalNameMap} map
 */
function normalizeEntries(map) {
  return [...map.entries()]
    .sort()
    .map(([packagePath, canonicalName]) => [
      path.normalize(path.relative(__dirname, packagePath)),
      canonicalName,
    ])
}

test('project 1', async (t) => {
  const canonicalNameMap = await loadCanonicalNameMap({
    rootDir: path.join(__dirname, 'projects', '1'),
  })
  t.deepEqual(
    normalizeEntries(canonicalNameMap),
    normalizePaths([
      ['projects/1', '$root$'],
      ['projects/1/node_modules/aaa', 'aaa'],
      ['projects/1/node_modules/bbb', 'bbb'],
      ['projects/1/node_modules/bbb/node_modules/evil_dep', 'bbb>evil_dep'],
    ])
  )
})

test('project 2', async (t) => {
  const canonicalNameMap = await loadCanonicalNameMap({
    rootDir: path.join(__dirname, 'projects', '2'),
  })
  t.deepEqual(
    normalizeEntries(canonicalNameMap),
    normalizePaths([
      ['projects/2', '$root$'],
      ['projects/2/node_modules/aaa', 'aaa'],
      ['projects/2/node_modules/bbb', 'bbb'],
      ['projects/2/node_modules/bbb/node_modules/evil_dep', 'bbb>evil_dep'],
      ['projects/2/node_modules/good_dep', 'good_dep'],
    ])
  )
})

test('project 3', async (t) => {
  const canonicalNameMap = await loadCanonicalNameMap({
    rootDir: path.join(__dirname, 'projects', '3'),
  })
  t.deepEqual(
    normalizeEntries(canonicalNameMap),
    normalizePaths([
      ['projects/3', '$root$'],
      ['projects/3/node_modules/aaa', 'aaa'],
      ['projects/3/node_modules/bbb', 'bbb'],
      ['projects/3/node_modules/bbb/node_modules/good_dep', 'bbb>good_dep'],
      ['projects/3/node_modules/evil_dep', 'evil_dep'],
    ])
  )
})

test('project 4 - workspace symlink', async (t) => {
  await createProject4Symlink()

  const canonicalNameMap = await loadCanonicalNameMap({
    rootDir: path.join(__dirname, 'projects', '4', 'packages', 'stuff'),
  })

  t.deepEqual(
    normalizeEntries(canonicalNameMap),
    normalizePaths([
      ['projects/4/node_modules/aaa', 'aaa'],
      ['projects/4/node_modules/bbb', 'bbb'],
      ['projects/4/packages/aaa', 'aaa'], // symlink resolved
      ['projects/4/packages/stuff', '$root$'],
    ])
  )
})

test('project 1 - with custom resolver', async (t) => {
  const rootDir = path.join(__dirname, 'projects', '1')
  /** @type {import('../src/index.js').Resolver} */
  const resolver = {
    sync: (moduleId, { basedir }) => {
      return Module.createRequire(path.join(basedir, 'dummy.js')).resolve(
        moduleId
      )
    },
  }
  const canonicalNameMap = await loadCanonicalNameMap({
    rootDir,
    resolve: resolver,
  })
  t.deepEqual(
    normalizeEntries(canonicalNameMap),
    normalizePaths([
      ['projects/1', '$root$'],
      ['projects/1/node_modules/aaa', 'aaa'],
      ['projects/1/node_modules/bbb', 'bbb'],
      ['projects/1/node_modules/bbb/node_modules/evil_dep', 'bbb>evil_dep'],
    ])
  )
})

test('project 1 - resolution failure', async (t) => {
  const rootDir = path.join(__dirname, 'projects', '1')
  /** @type {import('../src/index.js').Resolver} */
  const resolver = {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    sync: (moduleId, { basedir }) => {
      throw new Error('grumble')
    },
  }
  await t.throwsAsync(async () => {
    await loadCanonicalNameMap({
      rootDir,
      resolve: resolver,
    })
  })
})

test('project 1 - resolution missing silently', async (t) => {
  const rootDir = path.join(__dirname, 'projects', '1')
  /** @type {import('../src/index.js').Resolver} */
  const errors = [
    new Error('Cannot find module dude!'),
    { code: 'MODULE_NOT_FOUND' },
  ]

  const resolver = {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    sync: (moduleId, { basedir }) => {
      throw errors.pop()
    },
  }
  let canonicalNameMap
  await t.notThrowsAsync(async () => {
    canonicalNameMap = await loadCanonicalNameMap({
      rootDir,
      resolve: resolver,
    })
  })

  t.deepEqual(
    normalizeEntries(canonicalNameMap),
    normalizePaths([['projects/1', '$root$']])
  )
})
