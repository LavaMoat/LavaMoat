/* eslint-disable no-undef, @typescript-eslint/no-unused-vars, no-unused-expressions, no-extend-native */
const test = require('ava')
const { jsonStringifySortedPolicy } = require('../src/stringifyPolicy')
const { createConfigForTest, generateConfigFromFiles } = require('./util')

test('stringifyPolicy - policy for a large file tree is ordered', async (t) => {
  const tree = {
    c11: {
      cc1: {
        ccc: {
          x: null,
          aa1: { x: null },
        },
        a11: { x: null },
      },
    },
    b11: {
      bb1: {
        bbb: { x: null },
        aaa: { x: null },
      },
      x: null,
    },
  }
  const files = [
    {
      type: 'js',
      specifier: './entry.js',
      file: './entry.js',
      packageName: '$root$',
      importMap: {
        test: './node_modules/test/index.js',
      },
      content: 'require("test")',
      entry: true,
    },
    {
      type: 'js',
      specifier: `./node_modules/x/index.js`,
      file: `./node_modules/x/index.js`,
      packageName: 'x',
      importMap: {},
      content: '',
    },
  ]

  const mkFiles = (name, deps, nesting = '') => {
    if (deps == null) return
    const nestedName = nesting + name
    files.push({
      type: 'js',
      specifier: `./node_modules/${name}/index.js`,
      file: `./node_modules/${name}/index.js`,
      packageName: nestedName,
      importMap: Object.fromEntries(
        Object.keys(deps).map((dep) => [dep, `./node_modules/${dep}/index.js`])
      ),
      content: '',
    })
    Object.entries(deps).forEach(([depName, depDeps]) => {
      mkFiles(depName, depDeps, `${nestedName}>`)
    })
  }

  mkFiles('test', tree)

  // shuffle the files to ensure order doesn't matter
  files.sort(() => Math.random() - 0.5)

  const policy = await generateConfigFromFiles({ files })

  const sortedPolicy = jsonStringifySortedPolicy(policy)
  t.snapshot(sortedPolicy)
})
