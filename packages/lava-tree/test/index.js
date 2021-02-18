const test = require('ava')
const logicalTree = require('npm-logical-tree')
const {
  // // uses fs
  // loadTree,
  // parseYarnLockForPackages,
  // // uses fs + tree
  // findAllFilePathsForTree,
  // findFilePathForTreeNode,
  // uses tree
  createQualifiedNameLookupTable,
  // uses packageRootsMap
  lookupQualifiedNameForPath,
  // util
  getQualifiedNameDataForUrl,
  getPackagePathDepth,
  packageRootsFromPath,
  isPathInside,
} = require('../src/index.js')

test('createQualifiedNameLookupTable', (t) => {
  const pkg = {
    dependencies: {
      'a': '^1.0.0',
      'b': '^2.0.0'
    }
  }
  const pkgLock = {
    dependencies: {
      'a': {
        version: '1.0.1',
        resolved: 'https://registry.yarnpkg.com/a/-/a-1.0.1.tgz#abcdef',
        requires: {
          b: '2.0.2',
          c: '3.0.3'
        },
        dependencies: {
          'c': {
            version: '3.0.3',
            resolved: 'https://registry.yarnpkg.com/c/-/c-3.0.3.tgz#abcdef',
            requires: {
              b: '2.0.2'
            }
          }
        }
      },
      'b': {
        version: '2.0.2',
        resolved: 'https://registry.yarnpkg.com/b/-/b-2.0.2.tgz#abcdef',
        requires: {
          'a': '1.0.1'
        }
      }
    }
  }
  const tree = logicalTree(pkg, pkgLock)
  const packageRootMap = createQualifiedNameLookupTable(tree)
  looseCompareMap(t, packageRootMap, new Map(Object.entries({
    '': { qualifiedName: '<root>' },
    'node_modules/a': { qualifiedName: 'a', registry: 'npm' },
    'node_modules/a/node_modules/c': { qualifiedName: 'c', registry: 'npm' },
    'node_modules/b': { qualifiedName: 'b', registry: 'npm' },
  })))
})


test('lookupQualifiedNameForPath', (t) => {
  const packageRootMap = new Map(Object.entries({
    'node_modules/x': 'npm:x',
    'node_modules/x/node_modules/@y/z': 'npm:@y/z',
    'node_modules/x/node_modules/@y/z/node_modules/w': 'npm:w',
  }))
  t.is(lookupQualifiedNameForPath('node_modules/x/readme.md', packageRootMap), 'npm:x')
  t.is(lookupQualifiedNameForPath('node_modules/x/node_modules/@y/z', packageRootMap), 'npm:@y/z')
  t.is(lookupQualifiedNameForPath('node_modules/x/node_modules/@y/z/node_modules/w', packageRootMap), 'npm:w')
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

test('getQualifiedNameDataForUrl', (t) => {
  t.deepEqual(getQualifiedNameDataForUrl(
    'https://registry.npmjs.org/zwitch/-/zwitch-1.0.5.tgz'
  ), { qualifiedName: 'zwitch', registry: 'npm' })
  t.deepEqual(getQualifiedNameDataForUrl(
    'https://registry.yarnpkg.com/@babel/code-frame/-/code-frame-7.10.4.tgz#168da1a36e90da68ae8d49c0f1b48c7c6249213a'
  ), { qualifiedName: '@babel/code-frame', registry: 'npm' })
  t.deepEqual(getQualifiedNameDataForUrl(
    'git+ssh://git@github.com/ethereumjs/ethereumjs-abi.git#1ce6a1d64235fabe2aaf827fd606def55693508f'
  ), { qualifiedName: 'github:ethereumjs/ethereumjs-abi', registry: 'github' })
  t.deepEqual(getQualifiedNameDataForUrl(
    'https://codeload.github.com/LavaMoat/bad-idea-collection-non-canonical-keccak/tar.gz/d4718c405bd033928ebfedaca69f96c5d90ef4b0'
  ), { qualifiedName: 'github:LavaMoat/bad-idea-collection-non-canonical-keccak', registry: 'github' })
})

test('isPathInside', (t) => {
  t.is(isPathInside('x/y', 'x'), true)
  t.is(isPathInside('x/', 'x'), true)
  t.is(isPathInside('z', 'x'), false)
})

function looseCompareMap (t, mapA, mapB, message) {
  t.deepEqual([...mapA.entries()].sort(), [...mapB.entries()].sort(), message)
}