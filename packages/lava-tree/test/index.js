const test = require('ava')
const path = require('path')
const Arborist = require('@npmcli/arborist')

const {
  // uses fs
  loadTree,
  // parseYarnLockForPackages,
  // // uses fs + tree
  // findAllFilePathsForTree,
  // findFilePathForTreeNode,
  // uses tree
  createQualifiedNameLookupTable,
  // uses packageRootsMap
  lookupQualifiedNameDataForPath,
  // util
  eachNodeInTree,
  getQualifiedNameDataForTreeNode,
  getQualifiedNameDataForUrl,
  getPackagePathDepth,
  packageRootsFromPath,
  isPathInside,
} = require('../src/index.js')


async function loadTreeVirtual ({ projectRoot = process.cwd() } = {}) {
  const arb = new Arborist({
    path: projectRoot,
  })
  const tree = await arb.loadVirtual()
  return tree
}

test('createQualifiedNameLookupTable - lavamoat monorepo', async (t) => {
  const projectRoot = path.resolve(path.join(__dirname, '..', '..', '..'))
  const tree = await loadTree({ projectRoot })
  const packageRootMap = createQualifiedNameLookupTable(tree, projectRoot)
  // lookup this file
  const filepath = path.relative(projectRoot, __filename)
  const qualifiedNameData = lookupQualifiedNameDataForPath(filepath, packageRootMap, 'linux', '/')
  t.deepEqual(qualifiedNameData, {
    registry: 'file',
    qualifiedName: 'file:/packages/lava-tree',
  })
})

test('createQualifiedNameLookupTable - package-lock mm snapshot', async (t) => {
  const projectRoot = path.join(__dirname, 'fixtures', 'npm-mm-snapshot')
  const tree = await loadTreeVirtual({ projectRoot })
  const packageRootMap = createQualifiedNameLookupTable(tree, projectRoot)
  // regular deep dep
  lookupTest(
    'node_modules/postcss/node_modules/chalk/node_modules/supports-color/readme.md',
    {
      qualifiedName: 'supports-color',
      registry: 'npm',
    }
  )
  // bundled dep should report itself as from ganache-cli
  lookupTest(
    'node_modules/ganache-cli/node_modules/keccak/readme.md',
    {
      qualifiedName: 'ganache-cli',
      registry: 'npm',
    }
  )

  function lookupTest (filepath, expected) {
    const qualifiedNameData = lookupQualifiedNameDataForPath(filepath, packageRootMap, 'linux', '/')
    t.deepEqual(qualifiedNameData, expected)
  }
})

test('lookupQualifiedNameDataForPath', (t) => {
  const packageRootMap = new Map(Object.entries({
    'node_modules/x': 'npm:x',
    'node_modules/x/node_modules/@y/z': 'npm:@y/z',
    'node_modules/x/node_modules/@y/z/node_modules/w': 'npm:w',
  }))
  t.is(lookupQualifiedNameDataForPath('node_modules/x/readme.md', packageRootMap), 'npm:x')
  t.is(lookupQualifiedNameDataForPath('node_modules/x/node_modules/@y/z', packageRootMap), 'npm:@y/z')
  t.is(lookupQualifiedNameDataForPath('node_modules/x/node_modules/@y/z/node_modules/w', packageRootMap), 'npm:w')
})

test('packageRootsFromPath + getPackagePathDepth', (t) => {
  packageRootsTest('x', [])
  packageRootsTest(
    'node_modules/x/', [
    'node_modules/x',
  ])
  packageRootsTest(
    'node_modules/x/y', [
    'node_modules/x',
  ])
  packageRootsTest(
    'node_modules/x/lib/node_modules/y', [
    'node_modules/x',
  ])
  packageRootsTest(
    'node_modules/x/node_modules/@y/z/node_modules', [
    'node_modules/x',
    'node_modules/x/node_modules/@y/z',
  ])
  packageRootsTest(
    'node_modules/x/node_modules/y/@z/node_modules', [
    'node_modules/x',
    'node_modules/x/node_modules/y',
  ])

  function packageRootsTest(path, expected) {
    t.deepEqual([...packageRootsFromPath(path)], expected)
    t.deepEqual(getPackagePathDepth(path), expected.length)
  }
})

test('packageRootsFromPath', (t) => {
  t.deepEqual([...packageRootsFromPath(
    'x')]
  , [])
  t.deepEqual([...packageRootsFromPath(
    'node_modules/x/'
  )], [
    'node_modules/x',
  ])
  t.deepEqual([...packageRootsFromPath(
    'node_modules/x/y'
  )], [
    'node_modules/x',
  ])
  t.deepEqual([...packageRootsFromPath(
    'node_modules/x/lib/node_modules/y'
  )], [
    'node_modules/x',
  ])
  t.deepEqual([...packageRootsFromPath(
    'node_modules/x/node_modules/@y/z/node_modules'
  )], [
    'node_modules/x',
    'node_modules/x/node_modules/@y/z',
  ])
  t.deepEqual([...packageRootsFromPath(
    'node_modules/x/node_modules/y/@z/node_modules'
  )], [
    'node_modules/x',
    'node_modules/x/node_modules/y',
  ])
})

test('getQualifiedNameDataForTreeNode - non-resolved, non-bundled', (t) => {
  t.throws(() => {
    getQualifiedNameDataForTreeNode({ inBundle: false, resolved: null })
  })
})

test('getQualifiedNameDataForUrl + getQualifiedNameDataForTreeNode (resolved, bundled)', (t) => {
  qualifiedUrlTest(
    'https://registry.npmjs.org/zwitch/-/zwitch-1.0.5.tgz',
    { qualifiedName: 'zwitch', registry: 'npm' }
  )
  qualifiedUrlTest(
    'https://registry.yarnpkg.com/@babel/code-frame/-/code-frame-7.10.4.tgz#168da1a36e90da68ae8d49c0f1b48c7c6249213a',
    { qualifiedName: '@babel/code-frame', registry: 'npm' }
  )
  qualifiedUrlTest(
    'git+ssh://git@github.com/ethereumjs/ethereumjs-abi.git#1ce6a1d64235fabe2aaf827fd606def55693508f',
    { qualifiedName: 'github:ethereumjs/ethereumjs-abi', registry: 'github' }
  )
  qualifiedUrlTest(
    'https://codeload.github.com/LavaMoat/bad-idea-collection-non-canonical-keccak/tar.gz/d4718c405bd033928ebfedaca69f96c5d90ef4b0',
    { qualifiedName: 'github:LavaMoat/bad-idea-collection-non-canonical-keccak', registry: 'github' }
  )

  function qualifiedUrlTest(resolvedUrl, expected) {
    const fakeNodeResolved = { resolved: resolvedUrl }
    const fakeNodeBundled = { inBundle: true, parent: fakeNodeResolved }
    t.deepEqual(getQualifiedNameDataForTreeNode(fakeNodeResolved), expected)
    t.deepEqual(getQualifiedNameDataForTreeNode(fakeNodeBundled), expected)
    t.deepEqual(getQualifiedNameDataForUrl(resolvedUrl), expected)
  }
})

test('isPathInside', (t) => {
  t.is(isPathInside('x/y', 'x'), true)
  t.is(isPathInside('x/', 'x'), true)
  t.is(isPathInside('z', 'x'), false)
})

function looseCompareMap (t, mapA, mapB, message) {
  t.deepEqual([...mapA.entries()].sort(), [...mapB.entries()].sort(), message)
}